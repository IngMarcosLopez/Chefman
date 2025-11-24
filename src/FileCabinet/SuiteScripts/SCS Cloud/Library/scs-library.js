var scsLibrary = {

    /**
     * This function handles running any search, either a saved search or a custom, once off search. It grabs results
     * 1000 rows at a time until all results have been gathered.
     *
     * @param recordType - Record Type to run a search against.
     * @param filters - A single filter or array of filters for the search.
     * @param columns - A single column or array of columns to return.
     * @param savedSearch - Name of the saved search to execute
     * @param limit
     * @param offset
     * @returns {Array}
     */
    search: function (recordType, filters, columns, savedSearch, limit, offset) {
        var results = [];

        limit = limit ? limit : 100000;
        offset = offset ? offset : 0;
        var count = 1000;
        var init = true;
        var min = offset ? offset : 0;
        var max = limit < 1000 ? this.parseInt(offset) + this.parseInt(limit) : this.parseInt(offset) + 1000;
        if (savedSearch) {
            // Run an existing saved search
            var search = nlapiLoadSearch(recordType, savedSearch);
            if (filters) {
                search.addFilters(filters);
            }
            if (columns) {
                search.addColumns(columns);
            }

        } else {
            // Create a new, once off search
            var search = nlapiCreateSearch(recordType, filters, columns);
        }

        // Run the search and get all results
        var rs = search.runSearch();
        while (count == 1000 || init) {

            var resultSet = rs.getResults(min, max);
            if (resultSet) results = results.concat(resultSet);
            min = max;
            max += 1000;

            init = false;
            count = resultSet ? resultSet.length : 0;

            // Stop processing if we reach the limit
            if (results.length >= limit) break;
        }

        return results;
    },

    /**
     * A parseFloat function that returns 0 if the value is not a number.
     *
     * @param value
     * @returns {*}
     */
    parseFloat: function (value) {

        value = parseFloat(value);

        return isNaN(value) ? 0 : value;
    },

    /**
     * A parseInt function that returns 0 if the value is not a number.
     *
     * @param value
     * @returns {*}
     */
    parseInt: function (value) {

        value = parseInt(value);

        return isNaN(value) ? 0 : value;
    },

    /**
     * Returns the Entity Type of the provided Entity ID. This can be used if you need to load an Entity from an
     * Entity ID but do not know the type of Entity.
     *
     * @param id
     */
    getEntityType: function (id) {

        var type = nlapiLookupField('entity', id, 'type');

        return this.mapEntityType(type);
    },

    /**
     * Returns the Map Type name as used for loading records, based on Netsuite's saved Internal ID of the
     * Entity Type.
     */
    mapEntityType: function (entityType) {

        var entityTypeMap = {
            custjob: 'customer',
            vendor: 'vendor'
        };

        entityType = entityType.toLowerCase();

        return entityTypeMap.hasOwnProperty(entityType) ? entityTypeMap[entityType] : false;
    },

    /**
     * Returns the transaction type of the provided Item ID. This can be used if you need to load an item from an
     * Item ID but do not know the type of item.
     *
     * @param id
     */
    getItemType: function (id) {

        var type = nlapiLookupField('item', id, 'type');

        return this.mapItemType(type);
    },

    /**
     * Returns the Map Type name as used for loading records, based on Netsuite's saved Internal ID of the
     * Transaction Type.
     */
    mapItemType: function (itemType) {

        var itemTypeMap = {
            Service: 'serviceitem',
            InvtPart: 'inventoryitem',
            Group: 'itemgroup',
            NonInvtPart: 'noninventoryitem',
            Kit: 'kititem',
            Assembly: 'assemblyitem',
            OthCharge: 'otherchargeitem'
        };

        return itemTypeMap.hasOwnProperty(itemType) ? itemTypeMap[itemType] : false;
    },

    /**
     * Returns the transaction type of the provided transaction ID. This can be used to find out the Created From
     * (createdfrom) type.
     *
     * @param transactionId
     * @returns {*}
     */
    getTransactionType: function (transactionId) {

        var type = nlapiLookupField('transaction', transactionId, 'type');

        return this.mapTransactionType(type);
    },

    /**
     * Returns the Transaction Type name as used for loading records, based on Netsuite's saved Internal ID of the
     * Transaction Type.
     *
     * Example: A value of "PurchOrd" would return "purchaseorder".
     *
     * NOTE: This map is not complete and may need updating for some of the transaction types.
     *
     * @param transactionTypeInteral
     */
    mapTransactionType: function (transactionTypeInteral) {

        var transactionTypeMap = {
            build: 'assemblybuild',
            unbuild: 'assemblyunbuild',
            vendbill: 'bill',
            vendcard: 'billccard',
            vendcred: 'billcredit',
            binwksht: 'binputawayworksheet',
            bintrnfr: 'bintransfer',
            vendpymt: 'billpayment',
            cashrfnd: 'cashrefund',
            cashsale: 'cashsale',
            cardrfnd: 'ccardrefund',
            check: 'check',
            commissn: 'commission',
            cardchrg: 'creditcard',
            custcred: 'creditmemo',
            fxreval: 'currencyrevaluation',
            custdep: 'customerdeposit',
            custrfnd: 'customerrefund',
            deposit: 'deposit',
            depappl: 'depositapplication',
            exprept: 'expensereport',
            invadjst: 'inventoryadjustment',
            invcount: 'inventorycount',
            invdistr: 'inventorydistribution',
            invtrnfr: 'inventorytransfer',
            invwksht: 'inventoryworksheet',
            custinvc: 'invoice',
            itemship: 'itemfulfillment',
            itemrcpt: 'itemreceipt',
            journal: 'journal',
            opprtnty: 'opportunity',
            custpymt: 'payment',
            purchord: 'purchaseorder',
            estimate: 'quote',
            rtnauth: 'returnauthorization',
            salesord: 'salesorder',
            taxpymt: 'salestaxpayment',
            custchrg: 'statementcharge',
            transfer: 'transfer',
            trnfrord: 'transferorder',
            vendauth: 'vendorreturnauthorization',
            workord: 'workorder'
        };

        transactionTypeInteral = transactionTypeInteral.toLowerCase();

        return transactionTypeMap.hasOwnProperty(transactionTypeInteral) ? transactionTypeMap[transactionTypeInteral] : false;
    },

    /**
     * Checks if a Purchase Order is a Drop Shipment PO
     *
     * @param purchaseOrderId
     * @returns {boolean}
     */
    isDropshipPO: function (purchaseOrderId) {

        if (!purchaseOrderId) return false;

        var filters = [
            new nlobjSearchFilter('internalid', null, 'is', purchaseOrderId),
            new nlobjSearchFilter('appliedtolinktype', null, 'anyof', 'DropShip')
        ];

        var results = nlapiSearchRecord('purchaseorder', null, filters);

        if (results != null && results.length > 0) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Checks if a Purchase Order is a Special Order PO
     *
     * @param purchaseOrderId
     * @returns {boolean}
     */
    isSpecialOrderPO: function (purchaseOrderId) {

        if (!purchaseOrderId) return false;

        var filters = [
            new nlobjSearchFilter('internalid', null, 'is', purchaseOrderId),
            new nlobjSearchFilter('appliedtolinktype', null, 'anyof', 'SpecOrd')
        ];

        var results = nlapiSearchRecord('purchaseorder', null, filters);

        if (results != null && results.length > 0) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * A generic catch function that can be reused to handle SuiteScript try/catches.
     *
     * Example use:
     *      try {
     *          // Some code here
     *      } catch (error) {
     *          scsLibrary.catch(error);
     *      }
     *
     * @param {*} error
     */
    catch: function (error) {
        if (error instanceof nlobjError) {
            nlapiLogExecution('error', 'An error occurred.', 'Code: ' + error.getCode() + ' Details: ' + error.getDetails());
        } else {
            nlapiLogExecution('error', 'An unknown error occurred.', error.toString());
        }
    },

    /**
     * Taken from https://gist.github.com/iwek/7154578 (Oct 2018)
     *
     * @param {*} csv
     */
    csvToJSON: function (csv) {

        var lines = csv.split("\r\n");
        var result = [];

        var headers = lines[0].split(",");

        for (var i = 1; i < lines.length; i++) {

            var obj = {};
            var currentline = lines[i].split(",");

            for (var j = 0; j < headers.length; j++) {
                var headerName = headers[j].replace(/\s/g, '');
                headerName = headerName.toLowerCase();
                obj[headerName] = currentline[j];
            }

            result.push(obj);

        }

        return result; //JSON
    },

    /**
     * This function accepts an array of objects and transforms them into a CSV.
     *
     * Source: https://stackoverflow.com/questions/8847766/how-to-convert-json-to-csv-format-and-store-in-a-variable
     *
     * @param {*} data
     */
    toCSV: function (data) {
        var json = data;
        var fields = Object.keys(json[0]);
        var replacer = function (key, value) {
            return value === null ? '' : value
        };
        var csv = json.map(function (row) {
            return fields.map(function (fieldName) {
                return JSON.stringify(row[fieldName], replacer);
            }).join(',');
        });
        csv.unshift(fields.join(',')); // add header column

        return csv.join('\r\n');
    },

    /**
     * Removes duplicate values from an array.
     *
     * Taken from: https://stackoverflow.com/questions/1584370/how-to-merge-two-arrays-in-javascript-and-de-duplicate-items
     *
     * @param {*} array
     */
    arrayUnique: function (array) {
        var a = array.concat();
        for (var i = 0; i < a.length; ++i) {
            for (var j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j])
                    a.splice(j--, 1);
            }
        }

        return a;
    },

    /**
     * Checks API Governance and yields when the remaining usage drops below either a default of 150 or the provided
     * threshold.
     */
    checkAPIGovernanceAndYield: function (threshold) {

        threshold = typeof threshold == 'undefined' ? 150 : threshold;

        const context = nlapiGetContext();
        const remainingUsage = context.getRemainingUsage();
        if (remainingUsage < threshold) {

            const yieldResult = nlapiYieldScript();
            if (yieldResult.status != 'RESUME') {
                nlapiLogExecution('error', 'Yield failed', JSON.stringify(yieldResult));
                throw nlapiCreateError('YIELD_FAILURE', JSON.stringify(yieldResult));
            }
        }
    },
};

/**
 * Provides an easier way to insert variables into a string.
 *
 * Examples:
 *   - "Found {number} of {recordType} to process.".format({number: 1000, recordType: 'salesorder'});
 *   - "Found {0} of {1} to process.".format(1000, 'salesorder');
 */
String.prototype.format = String.prototype.format ||
    function () {
        "use strict";
        var str = this.toString();
        if (arguments.length) {
            var t = typeof arguments[0];
            var key;
            var args = ("string" === t || "number" === t) ?
                Array.prototype.slice.call(arguments)
                : arguments[0];

            for (key in args) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
            }
        }

        return str;
    };

/**
 * Allows a string to be truncated at a specified length and to replace anything beyond the specified length with a
 * suffix, which defaults to an ellipsis (...).
 *
 * Examples:
 *  - "The quick brown fox jumped over the lazy dog".truncate(9);
 *     Result: "The quick..."
 *  - "The quick brown fox jumped over the lazy dog".truncate(9, " (more)";
 *     Result: "The quick (more)"
 *
 * @param length - Position to truncate the string. If none is provided the string will not be truncated.
 * @param suffix - What suffix to add when replacing. Defaults to "..."
 * @returns {string}
 */
String.prototype.truncate = String.prototype.truncate ||
    function (length, suffix) {
        "use strict";
        var str = this.toString();

        if (typeof length == 'undefined') length = str.length;
        if (typeof suffix == 'undefined') suffix = '...';

        if (str.length > length)
            return str.substring(0, length) + suffix;
        else
            return str;
    }
