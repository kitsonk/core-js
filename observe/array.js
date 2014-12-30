define([
	'./observe',
	'../WeakMap',
	'./has!es7-object-observe?:./properties'
], function (observe, WeakMap, observableProperties) {
	'use strict';

	var push = Array.prototype.push,
		arraySplice = Array.prototype.splice,
		deliverChangeRecords = observableProperties ? observableProperties.deliverChangeRecords :
			Object.deliverChangeRecords;

	/* Stores any observe.array callbacks on an object */
	var arrayCallbacks = new WeakMap();

	/**
	 * Check if the provided value is an array index value
	 * @param  {Mixed}   idx A value that needs to be checked to see if it can be an array index
	 * @return {Boolean}     Returns `true` is the provided value is an array index, otherwise `false`
	 */
	function isIndex(idx) {
		return +idx === idx >>> 0;
	}

	/**
	 * Take a string or number value and typecast it to a Number
	 * @param  {String|Number} idx The value to be converted
	 * @return {Number}            The valid index value
	 */
	function toIndex(idx) {
		return +idx;
	}

	/**
	 * Create a new splice record
	 * @param  {Number} index      The index where the splice relates to
	 * @param  {Array}  removed    The elements that were removed from the array
	 * @param  {Number} addedCount The count of elements that were added
	 * @return {Object}            The splice record
	 */
	function newSplice(index, removed, addedCount) {
		return {
			index: index,
			removed: removed,
			addedCount: addedCount
		};
	}

	/**
	 * Calculate the intersection of two spans of indexes
	 * @param  {Number} start1 The first start index
	 * @param  {Number} end1   The first end index
	 * @param  {Number} start2 The second start index
	 * @param  {Number} end2   The second end index
	 * @return {Number}        Returns `-1` the spans do not intersect, `0` if they are adjacent to each other, other
	 *                         the position where the spans start to intersect.
	 */
	function intersect(start1, end1, start2, end2) {
		/* disjoint */
		if (end1 < start2 || end2 > start1) {
			return -1;
		}

		/* adjacent */
		if (end1 === start2 || end2 === start1) {
			return 0;
		}

		/* non-zero intersect, span1 first */
		if (start1 < start2) {
			if (end1 < end2) {
				return end1 - start2; /* overlap */
			}
			else {
				return end2 - start2; /* contained */
			}
		}
		/* non-zero intersect, span2 first */
		else {
			if (end2 < end1) {
				return end2 - start1; /* overlap */
			}
			else {
				return end1 - start1; /* contained */
			}
		}
	}

	/**
	 * Take a set of splices and merge in another splice where possible.  The input `splices` array will be modified
	 * appropriately.
	 * @param  {Array}  splices    The array of splice records
	 * @param  {Number} index      The new splices index
	 * @param  {Array}  removed    Any elements that are removed from the array
	 * @param  {Number} addedCount The count of elements that were added to the array
	 */
	function mergeSplice(splices, index, removed, addedCount) {
		var splice = newSplice(index, removed, addedCount),
			inserted = false,
			insertionOffset = 0,
			intersectCount,
			deleteCount,
			current,
			currentRemoved,
			prepend,
			append,
			offset,
			i;

		/* iterate through the existing splices */
		for (i = 0; i < splices.length; i++) {
			current = splices[i];
			current.index += insertionOffset;

			/* TODO: is this actually the most efficient way of handling the loop after the splice has been inserted? */
			/* the new splice has already been inserted, so need to do anything further */
			if (inserted) {
				continue;
			}

			/* determine how this splice */
			intersectCount = intersect(splice.index, splice.index + splice.removed.length, current.index,
				current.index + current.addedCount);

			/* if the intersectCount is a valid index (>=0), then the splice can be merged */
			if (~intersectCount) {
				splices.splice(i, 1);
				i--;

				insertionOffset -= current.addedCount - current.removed.length;

				splice.addedCount += current.addedCount - intersectCount;
				deleteCount = splice.removed.length + current.removed.length - intersectCount;

				if (!splice.addedCount && !deleteCount) {
					/* merged splice is a noop, discard */
					inserted = true;
				}
				else {
					currentRemoved = current.removed;
					if (splice.index < current.index) {
						/* some prefix of splice.removed is prepended to current.removed */
						prepend = splice.removed.slice(0, current.index - splice.index);
						push.apply(prepend, currentRemoved);
						currentRemoved = prepend;
					}

					if (splice.index + splice.removed.length > current.index + current.addedCount) {
						/* some suffix of splice.removed is appended to current.removed */
						append = splice.removed.slice(current.index + current.addedCount - splice.index);
						push.apply(currentRemoved, append);
					}

					splice.removed = currentRemoved;
					if (current.index < splice.index) {
						splice.index = current.index;
					}
				}
			}
			/* otherwise, if the new splice index precedes the current index, then this splice goes before the
			   current one, so go ahead and put it in */
			else if (splice.index < current.index) {
				inserted = true;

				splices.splice(i, 0, splice);
				i++;

				offset = splice.addedCount - splice.removed.length;
				current.index += offset;
				insertionOffset += offset;
			}
		}

		/* if we didn't insert the splice elsewhere, we need to append it */
		if (!inserted) {
			splices.push(splice);
		}
	}

	/**
	 * Creates the initial set of splice records from a set of change records which then need to be optimised further
	 * @param  {Array} changeRecords An array of change records
	 * @return {Array}               An array of splice records which then can be further optimised
	 */
	function createInitialSplices(changeRecords) {
		var splices = [],
			changeRecord,
			idx,
			i;

		/* iterate through the change records */
		for (i = 0; i < changeRecords.length; i++) {
			changeRecord = changeRecords[i];
			switch (changeRecord.type) {
			case 'splice':
				/* go ahead and try to merge this splice into any other splices */
				mergeSplice(splices, changeRecord.index, changeRecord.removed.slice(), changeRecord.addedCount);
				break;
			case 'add':
			case 'update':
			case 'delete':
				/* weed out any changes to non-index values that might be reported */
				if (!isIndex(changeRecord.name)) {
					continue;
				}
				idx = toIndex(changeRecord.name);
				if (!~idx) {
					continue;
				}
				/* convert the change into a splice and merge it */
				mergeSplice(splices, idx, [ changeRecord.oldValue ], 1);
				break;
			default:
				console.error('Unexpected record type:', JSON.stringify(changeRecord));
			}
		}

		return splices;
	}

	/**
	 * Determine what part of two arrays match, starting from the start of the array
	 * @param  {Array} first        The first array
	 * @param  {Array} second       The second array
	 * @param  {Number} searchLength How deep into the array to search
	 * @return {Number}              The index point at where the arrays diverge up to the searchLength
	 */
	function sharedPrefix(first, second, searchLength) {
		for (var i = 0; i < searchLength; i++) {
			if (first[i] !== second[i]) {
				return i;
			}
		}
		return searchLength;
	}

	/**
	 * Determine what part of two arrays match, starting from the end of the array
	 * @param  {Array} first        The first array
	 * @param  {Array} second       The second array
	 * @param  {Number} searchLength How deep from the end of the array to search
	 * @return {Number}              The count from at the end of the arrays where the two diverge
	 */
	function sharedSuffix(first, second, searchLength) {
		var firstIndex = first.length,
			secondIndex = second.length,
			count = 0;
		while (count < searchLength && first[--firstIndex] === second[--secondIndex]) {
			count++;
		}
		return count;
	}

	/* "constants" used in calculating the changes to an array */
	var EDIT_LEAVE = 0,
		EDIT_UPDATE = 1,
		EDIT_ADD = 2,
		EDIT_DELETE = 3;

	/**
	 * Given a set of distances, determine the minimal number of operations needed to perform the same change
	 * @param  {Array(Array)} distances A table of distances
	 * @return {Array}                  An array of edits to be made
	 */
	function spliceOperationsFromEditDistances(distances) {
		/* jshint maxcomplexity:11 */
		var i = distances.length - 1,
			j = distances[0].length - 1,
			current = distances[i][j],
			edits = [],
			northWest,
			west,
			north,
			min;

		while (i > 0 || j > 0) {
			if (i === 0) {
				edits.push(EDIT_ADD);
				j--;
				continue;
			}
			if (j === 0) {
				edits.push(EDIT_DELETE);
				i--;
				continue;
			}
			northWest = distances[i - 1][j - 1];
			west = distances[i - 1][j];
			north = distances[i][j - 1];

			min = west < north ? (west < northWest ? west : northWest) : (north < northWest ? north : northWest);

			if (min === northWest) {
				if (northWest === current) {
					edits.push(EDIT_LEAVE);
				}
				else {
					edits.push(EDIT_UPDATE);
					current = northWest;
				}
				i--;
				j--;
			}
			else if (min === west) {
				edits.push(EDIT_DELETE);
				i--;
				current = west;
			}
			else {
				edits.push(EDIT_ADD);
				j--;
				current = north;
			}
		}

		edits.reverse();
		return edits;
	}

	/**
	 * Generate the table of distances used to determine the least amount of edits that need to be made to provide a
	 * set of slices.
	 * @param  {Array}        current      The current targeted array
	 * @param  {Number}       currentStart The index where to start the table
	 * @param  {Number}       currentEnd   The index where to stop the table
	 * @param  {Array}        old          The previous array
	 * @param  {Number}       oldStart     The old index where to start the table
	 * @param  {Number}       oldEnd       The old index where to stop the table
	 * @return {Array(Array)}              The table of distances between edit changes to the two arrays
	 */
	function calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd) {
		/* "deletion" columns */
		var rowCount = oldEnd - oldStart + 1,
			columnCount = currentEnd - currentStart + 1,
			distances = new Array(rowCount);

		var north, west;

		/* "addition" rows, initialise null column */
		for (var i = 0; i < rowCount; i++) {
			distances[i] = new Array(columnCount);
			distances[i][0] = i;
		}

		/* initialise null row */
		for (var j = 0; j < columnCount; j++) {
			distances[0][j] = j;
		}

		for (i = 1; i < rowCount; i++) {
			for (j = 1; j < columnCount; j++) {
				if (old[oldStart + i - 1] === current[currentStart + j - 1]) {
					distances[i][j] = distances[i - 1][j - 1];
				}
				else {
					north = distances[i - 1][j] + 1;
					west = distances[i][j - 1] + 1;
					distances[i][j] = north < west ? north : west;
				}
			}
		}

		return distances;
	}

	/**
	 * Given two arrays, calculate the minimum number of splices needed to transform the previous array to the current
	 * array
	 * @param  {Array} current       The current array
	 * @param  {Number} currentStart The index where to start calculating the difference
	 * @param  {Number} currentEnd   The index where to stop calculating the difference
	 * @param  {Array} old           The previous array
	 * @param  {Number} oldStart     The previous array index where to start calculating the difference
	 * @param  {Number} oldEnd       The previous array index where to stop calculating the difference
	 * @return {Array}               The array of splice records
	 */
	function calcSplices(current, currentStart, currentEnd, old, oldStart, oldEnd) {
		var prefixCount = 0,
			suffixCount = 0,
			minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart),
			splice,
			ops;

		function applyOps(ops, idx, oldIdx) {
			/* jshint maxcomplexity:11 */
			var splice,
				splices = [],
				i;

			for (i = 0; i < ops.length; i++) {
				switch (ops[i]) {
				case EDIT_LEAVE:
					if (splice) {
						splices.push(splice);
						splice = undefined;
					}
					idx++;
					oldIdx++;
					break;
				case EDIT_UPDATE:
					if (!splice) {
						splice = newSplice(idx, [], 0);
					}
					splice.removed.push(old[oldIdx]);
					oldIdx++;
					break;
				case EDIT_ADD:
					if (!splice) {
						splice = newSplice(idx, [], 0);
					}
					splice.addedCount++;
					idx++;
					break;
				case EDIT_DELETE:
					if (!splice) {
						splice = newSplice(idx, [], 0);
					}
					splice.removed.push(old[oldIdx]);
					oldIdx++;
					break;
				}
			}

			if (splice) {
				splices.push(splice);
			}

			return splices;
		}

		if (currentStart === 0 && oldStart === 0) {
			prefixCount = sharedPrefix(current, old, minLength);
		}
		if (currentEnd === current.length && oldEnd === old.length) {
			suffixCount = sharedSuffix(current, old, minLength - prefixCount);
		}
		currentStart += prefixCount;
		oldStart += prefixCount;
		currentEnd -= suffixCount;
		oldEnd -= suffixCount;

		if (currentEnd - currentStart === 0 && oldEnd - oldStart === 0) {
			return [];
		}

		if (currentStart === currentEnd) {
			splice = newSplice(currentStart, [], 0);
			while (oldStart < oldEnd) {
				splice.removed.push(old[oldStart++]);
			}
			return [ splice ];
		}
		else if (oldStart === oldEnd) {
			return [ newSplice(currentStart, [], currentEnd - currentStart) ];
		}

		ops = spliceOperationsFromEditDistances(calcEditDistances(current, currentStart, currentEnd, old, oldStart,
			oldEnd));
		
		return applyOps(ops, currentStart, oldStart);
	}

	/**
	 * Take a set of change records and convert them into splice records.
	 *
	 * This and other supporting functions is directly adapted from Rafael Weinstien's
	 * [ChangeSummary](https://github.com/rafaelw/ChangeSummary),  which is part of Polymer's
	 * [Model Driven Views](https://github.com/polymer/mdv).
	 * 
	 * @param  {Array} target        The "subject" of the change records
	 * @param  {Array} changeRecords An array of change records that have occured to the array
	 * @return {Array}               An array of splice records.
	 */
	function projectArraySplices(target, changeRecords) {
		var splices = [];

		createInitialSplices(changeRecords).forEach(function (splice) {
			if (splice.addedCount === 1 && splice.removed.length === 1) {
				if (splice.removed[0] !== target[splice.index]) {
					splices.push(splice);
				}
				return;
			}

			splices = splices.concat(calcSplices(target, splice.index, splice.index + splice.addedCount,
				splice.removed, 0, splice.removed.length));
		});

		return splices;
	}

	/**
	 * Take an array of splice records and apply them to a previous version of the array.
	 * @param  {Array} previous The previous version of the array
	 * @param  {Array} current  The current version of the array
	 * @param  {Array} splices  An array of splice records to be applied
	 */
	function applySplices(previous, current, splices) {
		splices.forEach(function (splice) {
			var spliceArgs = [ splice.index, splice.removed.length ],
				addIndex = splice.index;
			while (addIndex < splice.index + splice.addedCount) {
				spliceArgs.push(current[addIndex]);
				addIndex++;
			}

			arraySplice.apply(previous, spliceArgs);
		});
	}

	/**
	 * Observe an array and provide summary splice records for the changes to the array.
	 * @param  {Array}   target   The array that should be targeted
	 * @param  {Function} callback The callback function that should be called when there are changes to the array
	 * @return {Object}            A handle object with a remove function that can be used to unobserve the array
	 */
	var arrayObserve = function (target, callback) {
		var callbacks,
			handle;

		/**
		 * The observation function that will take the Object.observe change records and convert them into splices
		 * @param  {Array} changeRecords An array of changes emitted by Object.observe
		 */
		function observer(changeRecords) {
			var splices = projectArraySplices(target, changeRecords);
			callbacks.forEach(function (callback) {
				callback.call(target, splices);
			});
		}

		if (!(Array.isArray(target))) {
			throw new TypeError('target is not an Array');
		}

		if (!(callbacks = arrayCallbacks.get(target))) {
			arrayCallbacks.set(target, callbacks = []);
			handle = observe(target, observer, false, null, [ 'add', 'update', 'delete', 'splice' ]);
		}

		callbacks.push(callback);

		return {
			remove: function () {
				deliverChangeRecords(observer);
				callbacks.splice(callbacks.indexOf(callback), 1);
				if (!callbacks.length) {
					handle && handle.remove();
					arrayCallbacks['delete'](target);
				}
			}
		};
	};

	arrayObserve.applySplices = applySplices;

	return arrayObserve;
});