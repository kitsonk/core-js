define([
	'./properties'
], function (observableProperties) {

	var createChangeRecord = observableProperties.createChangeRecord,
		createSpliceChangeRecord = observableProperties.createSpliceChangeRecord,
		slice = Array.prototype.slice;

	/**
	 * Calculates change records for an array based on Object.observe without splice records
	 * @param  {Array} oldArr The original array
	 * @param  {Array} newArr The current array
	 * @return {Array}        An array of change records that represent the delta between the two
	 *                        arrays.
	 */
	function calcObjectChangeRecords(oldArr, newArr, isSplice) {
		var oldLength = oldArr.length,
			newLength = newArr.length,
			oldValue,
			newValue,
			i,
			changeRecords = [];

		/* iterate through array and find any changes */
		for (i = 0; i < oldLength; i++) {
			oldValue = oldArr[i];
			newValue = newArr[i];
			if (oldValue !== newValue) {
				if (typeof newValue === 'undefined') {
					changeRecords.push(createChangeRecord('delete', newArr, i, oldValue));
				}
				else if (typeof oldValue === 'undefined') {
					changeRecords.push(createChangeRecord('add', newArr, i));
				}
				else {
					changeRecords.push(createChangeRecord('update', newArr, i, oldValue));
				}
			}
		}
		for (i = oldLength; i < newLength; i++) {
			oldValue = oldArr[i];
			newValue = newArr[i];
			if (typeof newValue !== 'undefined') {
				changeRecords.push(createChangeRecord('add', newArr, i));
			}
		}

		/* record change in length */
		if (!isSplice && oldLength !== newLength) {
			changeRecords.push(createChangeRecord('update', newArr, 'length', oldLength));
		}

		return changeRecords;
	}

	function calcSpliceRecords(oldArr, newArr, method, args) {
		var addedCount = 0,
			idx,
			argsLength = args.length,
			newArrLength = newArr.length,
			oldArrLength = oldArr.length,
			removed = [],
			removedCount;
		switch (method) {
		case 'length':
			if (newArrLength > oldArrLength) {
				addedCount = newArrLength - oldArrLength;
				idx = oldArrLength;
			}
			else if (newArrLength < oldArrLength) {
				removed = slice.call(oldArr, oldArrLength - newArrLength);
				idx = newArrLength;
			}
			else {
				return;
			}
			break;
		case 'push':
			addedCount = argsLength;
			idx = newArrLength - argsLength;
			break;
		case 'unshift':
			addedCount = argsLength;
			idx = 0;
			break;
		case 'pop':
			removed.push(oldArr[newArrLength]);
			idx = newArrLength;
			break;
		case 'shift':
			removed.push(oldArr[0]);
			idx = 0;
			break;
		case 'splice':
			removedCount = args[1];
			idx = args[0];
			if (removedCount) {
				removed = slice.call(oldArr, idx, idx + removedCount);
			}
			addedCount = args.slice(2).length;
		}

		return createSpliceChangeRecord(newArr, idx, removed, addedCount);
	}

	return {
		calcObjectChangeRecords: calcObjectChangeRecords,
		calcSpliceRecords: calcSpliceRecords
	};
});