/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * Script Type: library
 */

define(['N/search'],

    /**
     *
     * @param {search} search
     * @returns {scs_library}
     */
    (search) => {
        'use strict';

        class scs_library {
            constructor() {

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

                        if (str.length > length) {
                            return str.substring(0, length) + suffix;
                        } else {
                            return str;
                        }
                    }
            }

            /**
             * A parseInt function that returns 0 if the value is not a number.
             *
             * @param value
             * @returns {*}
             */
            parseInt(value) {

                value = parseInt(value);

                return isNaN(value) ? 0 : value;
            }

            /**
             * A parseFloat function that returns 0 if the value is not a number.
             *
             * @param value
             * @returns {*}
             */
            parseFloat(value) {
                value = parseFloat(value);

                return isNaN(value) ? 0 : value;
            }

            /**
             * This function handles running any search, either a saved search or a custom, once off search. It grabs results
             * 1000 rows at a time until all results have been gathered.
             *
             * @param type - search type to run a search against.
             * @param filters - A single filter or array of filters for the search.
             * @param columns - A single column or array of columns to return.
             * @param searchId - id of the saved search to execute
             * @param limit
             * @param offset
             * @returns {Array}
             */
            search({searchType: type, filters, columns, searchId: id, limit, offset}) {
                let results = [];
                limit = limit ? limit : 100000;
                let count = 1000;
                let init = true;
                let start = offset || 0;
                let end = (limit || 100000) < 1000 ? this.parseInt(offset || 0) + this.parseInt(limit || 100000) : this.parseInt(offset || 0) + 1000;
                let savedSearch = null;

                if (id) {
                    // Run an existing saved search
                    savedSearch = search.load({type, id})
                    //add filters
                    if (filters) {
                        savedSearch.filters = [...savedSearch.filters, ...filters];
                    }
                    //add columns
                    if (columns) {
                        savedSearch.columns = [...savedSearch.columns, ...columns];
                    }
                } else {
                    // Create a new, once off search
                    savedSearch = search.create({type, filters, columns});
                }

                // Run the search and get all results
                const rs = savedSearch.run();
                while (count == 1000 || init) {

                    let resultSet = rs.getRange({start, end});
                    if (resultSet) results = results.concat(resultSet);
                    start = end;
                    end += 1000;

                    init = false;
                    count = resultSet ? resultSet.length : 0;

                    // Stop processing if we reach the limit
                    if (results.length >= limit) break;
                }

                return results;
            }

            /**
             * Returns the Entity Type of the provided Entity ID. This can be used if you need to load an Entity from an
             * Entity ID but do not know the type of Entity.
             *
             * @param id
             */
            getEntityType(id) {
                const {type: [{value, text}, ...rest]} = search.lookupFields({type: 'entity', id, columns: ['type']})
                return this.mapEntityType(value);
            }

            /**
             * Returns the Map Type name as used for loading records, based on Netsuite's saved Internal ID of the
             * Entity Type.
             */
            mapEntityType(entityType) {

                const entityTypeMap = {
                    custjob: 'customer',
                    vendor: 'vendor'
                };

                entityType = entityType.toLowerCase();

                return entityTypeMap.hasOwnProperty(entityType) ? entityTypeMap[entityType] : false;
            }

            /**
             * Returns the transaction type of the provided Item ID. This can be used if you need to load an item from an
             * Item ID but do not know the type of item.
             *
             * @param id
             */
            getItemType(id) {
                const {type: [{value, text}, ...rest]} = search.lookupFields({type: 'item', id, columns: ['type']})
                return this.mapItemType(value);
            }

            /**
             * Returns the Map Type name as used for loading records, based on Netsuite's saved Internal ID of the
             * Transaction Type.
             */
            mapItemType(itemType) {

                const itemTypeMap = {
                    Service: 'serviceitem',
                    InvtPart: 'inventoryitem',
                    Group: 'itemgroup',
                    NonInvtPart: 'noninventoryitem',
                    Kit: 'kititem',
                    Assembly: 'assemblyitem',
                    OthCharge: 'otherchargeitem'
                };

                return itemTypeMap.hasOwnProperty(itemType) ? itemTypeMap[itemType] : false;
            }

            /**
             * Returns the transaction type of the provided transaction ID. This can be used to find out the Created From
             * (createdfrom) type.
             *
             * @param transactionId
             * @returns {*}
             */
            getTransactionType(transactionId) {
                const {type: [{value, text}, ...rest]} = search.lookupFields({
                    type: 'transaction',
                    id: transactionId,
                    columns: ['type']
                })
                return this.mapTransactionType(value);
            }

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
            mapTransactionType(transactionTypeInteral) {

                const transactionTypeMap = {
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
                    journal: 'journalentry',
                    opprtnty: 'opportunity',
                    custpymt: 'customerpayment',
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
            }

            /**
             * Checks if a Purchase Order is a Drop Shipment PO
             *
             * @param purchaseOrderId
             * @returns {boolean}
             */
            isDropshipPO(purchaseOrderId) {

                if (!purchaseOrderId) return false;

                const results = this.search({
                    searchType: 'purchaseorder'
                    , filters: [
                        ['internalid', 'is', purchaseOrderId]
                        , 'AND', ['appliedtolinktype', 'anyof', 'DropShip']
                    ]
                    , columns: [search.createColumn({name: 'internalid'})]
                    , limit: 1
                })

                return results && !!results.length;
            }

            /**
             * Checks if a Purchase Order is a Special Order PO
             *
             * @param purchaseOrderId
             * @returns {boolean}
             */
            isSpecialOrderPO(purchaseOrderId) {

                if (!purchaseOrderId) return false;

                const results = this.search({
                    searchType: 'purchaseorder'
                    , filters: [
                        ['internalid', 'is', purchaseOrderId]
                        , 'AND', ['appliedtolinktype', 'anyof', 'SpecOrd']
                    ]
                    , columns: [search.createColumn({name: 'internalid'})]
                    , limit: 1
                })

                return results && !!results.length;
            }

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
            catch(error) {
                if (!!error.code) {
                    log.error('An error occurred.', 'Code: ' + error.code + ' Details: ' + error.message);
                } else {
                    log.error('An unknown error occurred.', error);
                }
            }

            /**
             * Taken from https://gist.github.com/iwek/7154578 (Oct 2018)
             *
             * @param {*} csv
             */
            csvToJSON(csv) {

                const lines = csv.split("\r\n");
                const result = [];

                const headers = lines[0].split(",");

                for (let i = 1; i < lines.length; i++) {

                    const obj = {};
                    const currentline = lines[i].split(",");

                    for (let j = 0; j < headers.length; j++) {
                        let headerName = headers[j].replace(/\s/g, '');
                        headerName = headerName.toLowerCase();
                        obj[headerName] = currentline[j];
                    }

                    result.push(obj);

                }

                return result; //JSON
            }

            /**
             * This function accepts an array of objects and transforms them into a CSV.
             *
             * Source: https://stackoverflow.com/questions/8847766/how-to-convert-json-to-csv-format-and-store-in-a-variable
             *
             * @param {*} data
             */
            toCSV(data) {
                const json = data;
                const fields = Object.keys(json[0]);
                const replacer = (key, value) => value || '';
                let csv = json.map(row => fields.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
                csv.unshift(fields.join(',')); // add header column

                return csv.join('\r\n');
            }
        }

        return new scs_library();
    });
