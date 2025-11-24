/**
 *
 * @NApiVersion 2.0
 * @NScriptType RestLet
 * @NModuleScope Public
 *
 */
const DEPENDENCIES = [
    'N/search',
    'N/record',
    'N/error'
];

const CE_OBJECT_TO_SUITE_OBJECT = {
    "customers": "customer",
    "invoices": "invoice",
    "customer-payments": "customerpayment",
    "vendors": "vendor",
    "vendor-bills": "vendorbill"
};

define(DEPENDENCIES, function (Search, Record) {

    const ELEMENT_KEY = "netsuiterestlets";
    const GENERIC_EXCEPTION = "Something Bad Happened";

    const LOG_LEVEL_DEBUG = "debug";
    const LOG_LEVEL_ERROR = "error";
    const BULK_ERROR = "BULK_ERROR";


    const STATUS_CODE = {
        "bad_request": "MISSING_REQD_PARAMS",
        "empty_results": "EMPTY_RECORDS_IN_SYSTEM"
    };

    const BULK_ERRORS = {
        "bulk_payload_error": "bulk create only supports array of objects"
    };

    const ACTIONS = {
        post: doexecute,
        get: hearbeat,
        put: hearbeat,
        delete: hearbeat
    };

    /**
     * Summary. Loads all the records in the system.
     * Description. Creates a search and calls get Record for each internal Id. This is a very costly operation. to be only used with range and legacy mode set to true
     *
     * datain.range : specifies the start and end. mapped to page and pageSize for CE
     * datain.type : Object id for CE, Record ID for Netsuite.
     *
     * @Param datain payload data from the server
     * @returns {Array}
     */
    function legacy_getRecordsOfType(datain) {
        try {

            var records = Search.create(datain).run().getRange(datain.range);

            var result = [];

            for (var recordIdx = 0; recordIdx < records.length; recordIdx++) {
                var recordType = datain.type;
                var internalId = records[recordIdx].id;

                var dataIntoGetRecordById = {
                    type: recordType,
                    id: internalId
                };
                var eachRecordType = getRecordById(dataIntoGetRecordById);
                result.push(eachRecordType);
            }
            return result;
        } catch (err) {
            return prepareErrorObject(STATUS_CODE.bad_request, err);
        }
    }


    /**
     * Modifying the range as per CE standards
     *
     * @param range
     * @return {{start: number, end: number}}
     */
    function modifyRange(range) {
        var rangetemplate = {
            "start": 0,
            "end": 200
        };
        stackdebugpoint("Given range::" + JSON.stringify(range));
        var start = parseInt(range.start);
        var end = parseInt(range.end);
        if (range != undefined) {
            rangetemplate.start = start;
            rangetemplate.end = start + end;
            stackdebugpoint("Modified range::" + JSON.stringify(rangetemplate));
            return rangetemplate
        }
        return rangetemplate;
    }

    /**
     * Function used to debug issues in script execution
     * @param symbol
     */
    function stackdebugpoint(symbol) {
        celog(LOG_LEVEL_DEBUG, "Naive", "Print Debug stack Only for Debugging purpose ::: " + symbol);
    }

    /**
     *
     * Summary. GetsRecords of type netsuite object.
     * Filters must be something like this [[lastmodifieddate ,  is , datetime], and, [internlaid, is, 2]]
     * Please refer to documentation for complex filters like and , or , is null etc.
     *
     * datain.range : specifies the start and end. mapped to page and pageSize for CE
     * datain.type : Object id for CE, Record ID for Netsuite.
     *
     * @param datain
     * @returns {Array}
     */
    function getRecordsOfType(datain) {
        try {
            var cols = datain.payload.columns || [];
            var filters = datain.payload.filters || [];

            var dataIntoSearch = {
                type: datain.type,
                filters: filters,
                columns: cols,
            };

            var result = [];
            var range = modifyRange(datain.payload.range);
            var resultSet = Search.create(dataIntoSearch).run().getRange(range);
            resultSet.forEach(function (eachRecord) {
                var resultRecord = {};
                for (var colIdx = 0; colIdx < cols.length; colIdx++) {
                    var colInRec = cols[colIdx].name;
                    try {
                        handleDateFormatsForSearchAll(resultRecord, eachRecord, colInRec)
                    } catch (err) {
                        celog(LOG_LEVEL_DEBUG, "Get All Records", err);
                        throw err;
                    }
                }
                result.push(resultRecord);
            });
            return result;
        } catch (err) {
            return prepareErrorObject(err.code, err);
        }
    }


    /**
     *
     * Summary. Converts NetSuite date format to ISO Date String.
     * @param resultRecord
     * @param eachRecord
     * @param colInRec
     */
    function handleDateFormatsForSearchAll(resultRecord, eachRecord, colInRec) {
        var value = eachRecord.getValue({
            name: colInRec
        });
        if (colInRec.indexOf("date") >= 0) {
            try {
                resultRecord[colInRec] = new Date(value).toISOString();
            } catch (e) {
                resultRecord[colInRec] = value;
            }
        } else {
            resultRecord[colInRec] = value;
        }
    }

    /**
     * KT function, can choose to remove
     *
     * @param cols
     * @return {Array}
     */
    function createSearchCol(cols) {
        var searchColArr = [];
        var excludeArray = ["partnercontribution"];
        for (var fieldIdx = 0; fieldIdx < cols.length; fieldIdx++) {
            var col = cols[fieldIdx];
            if (!excludeArray.includes(col)) {
                searchColArr.push(Search.createColumn({ name: col }));
            }
        }
        return searchColArr;
    }

    /**
     * Summary. Get a record in Netsuite by its Internal Id.
     *
     * @param datain Data Passed as part of rest call, mostly a body of post, must be of type application/json
     *
     * Usage : datain.method : getbyId, datain.recordtype: 'customer', datain.id: '600'
     */
    function getRecordById(datain) {
        var requestPayload = {};
        requestPayload.type = datain.type;
        requestPayload.id = datain.payload.id;
        try {
            celog(LOG_LEVEL_DEBUG, "ERROR occurred while preparing objects", "here");
            return formatRecord(Record.load(requestPayload));
        } catch (err) {
            celog(LOG_LEVEL_DEBUG, "ERROR occurred while preparing objects", err);
            return prepareErrorObject(err.name, err);
        }
    }

    /**
     * Summary. Create a record in Netsuite.
     *
     * @param datain Data Passed as part of rest call, mostly a body of post, must be of type application/json
     */
    function createRecord(datain) {

        var recordtype = datain.recordtype;

        if (!recordtype) {
            return prepareErrorObject(STATUS_CODE.bad_request, "Missing required Param Record Type");
        }

        var recordholder = Record.create({
            type: recordtype,
            isDynamic: true,
            defaultValues: null
        });

        var payload = datain.payload;

        try {
            for (var fieldname in payload) {
                if (payload.hasOwnProperty(fieldname)) {
                    var value = payload[fieldname];
                    if (value && typeof value != 'object') {
                        if (fieldname.indexOf("date") > -1) {
                            value = new Date(value);
                        }
                        recordholder.setValue({
                            fieldId: fieldname,
                            value: value
                        });
                    } else {
                        addLine(recordholder, fieldname, value);
                    }
                }
            }
            var record = recordholder.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
        } catch (err) {
            return prepareErrorObject(err.name, err);
        }

        var isErrorExists = record.error;
        if (isErrorExists != null && isErrorExists != undefined) {
            throw prepareErrorObject("RECORD_CREATION_FAILED", record);
        }

        var result = {};
        result.internalId = record;

        return result;
    }

    function addLine(rec, fieldName, sublistObject) {
        if (sublistObject == null || sublistObject == "") {
            return;
        }
        if (sublistObject instanceof Array) {
            for (var index = 0; index < sublistObject.length; index++) {
                prepareAndCommitSublist(rec, fieldName, sublistObject[index], index);
            }
        } else {
            celog(LOG_LEVEL_DEBUG, "Add to SubList", fieldName + ":" + sublistObject.toString());
            throw new Object({ message: "Cannot upload Objects. Wrap sublist in Array" });
        }
    }

    function prepareAndCommitSublist(rec, fieldName, sublistValue, index) {
        try {
            var FIELD_IDS = {
                ITEM: "item",
                LINE: "line"
            };
            celog(LOG_LEVEL_DEBUG, "SubListID", fieldName);
            rec.selectNewLine({ sublistId: fieldName });
            celog(LOG_LEVEL_DEBUG, "setting sublist Field", sublistValue);

            if (!checkIfAutoGenPk(fieldName)) {
                rec.setCurrentSublistValue({
                    sublistId: fieldName,
                    fieldId: fieldName,
                    value: sublistValue
                });

                if (fieldName == FIELD_IDS.ITEM) {
                    celog(LOG_LEVEL_DEBUG, "Line number:", index);
                    rec.setCurrentSublistValue({
                        sublistId: fieldName,
                        fieldId: FIELD_IDS.LINE,
                        value: index
                    });
                }
            }
            rec.commitLine({ sublistId: fieldName });
        } catch (err) {
            celog(LOG_LEVEL_DEBUG, "Error occurred", err);
            celog(LOG_LEVEL_DEBUG, "Error setting sublist", fieldName);
            celog(LOG_LEVEL_DEBUG, "Error setting sublist Object", sublistValue);
        }
    }

    function checkIfAutoGenPk(fieldName) {
        return fieldName == "sys_parentid" || fieldName == "sys_id";
    }

    /**
     * Summary. No op Function is used when used does an operation which is not supported yet by the script
     */
    function NoOp() {
        return prepareErrorObject(STATUS_CODE.bad_request, "This operation is not supported by ce");
    }


    /**
     * Summary. Validate any mandatory params required for the core functions, this is kind of a filter.
     * Validation for some mandatory params
     */
    function validateForMandatoryFields(datain) {
        var message = "";
        if (datain.method == "heartbeat") {
            return;
        }
        if (!datain.method) {
            message = "Missing method param in request body";
            throw prepareErrorObject(STATUS_CODE.bad_request, message);
        }
        if (!datain.payload) {
            message = "Missing payload object in request body";
            throw prepareErrorObject(STATUS_CODE.bad_request, message);
        }
        return null;
    }

    /**
     * Summary. This is used to check if the script is running fine in the NetSuite System.
     * Description.
     * Heart beat function to check if apis are accessible.
     * CE USAGE: provision auth validation
     */
    function hearbeat() {
        var object = new Object();
        object.dateTime = new Date().toISOString();
        object.endpoint = ELEMENT_KEY;
        return object;
    }

    /**
     * Utils code area
     */

    /**
     *
     * Summary. Utility function to prepare error objects
     *
     * @Param code maps to any unique identifier for that problem.
     * @Param message Any status message passed to user to let him know what exactly went wrong.
     */
    function prepareErrorObject(code, message) {
        var err = {};
        var errorObject = {};
        errorObject.message = message;
        err.error = errorObject;
        return err;
    }

    /**
     * Summary. Driver function to call all the inner functions
     *
     * @param datain Data Passed as part of rest call, mostly a body of post, must be of type application/json
     */
    function doexecute(datain) {
        var validationResults = validateForMandatoryFields(datain);
        if (validationResults != null) {
            celog(LOG_LEVEL_ERROR, "Error in validation", "Error in validating mandatory params");
            return validationResults;
        }
        return doExecuteRecords(datain);
    }

    function doExecuteRecords(datain) {
        if (datain.method === "getbyId") {
            return getRecordById(datain);
        } else if (datain.method === "get") {
            return getRecordsOfType(datain);
        } else if (datain.method === "create") {
            return createRecord(datain);
        } else if (datain.method === "update") {
            return updateRecordById(datain);
        } else if (datain.method === "deletebyId") {
            return deleteById(datain);
        } else if (datain.method === "bulkcreate") {
            return dobulkcreate(datain);
        } else if (datain.method === "attachFile") {
            return attachFileToRecord(datain);
        } else if (datain.method === "getlookupfields") {
            return getlookupfields(datain);
        } else if (datain.method === "getsampledataforsearch") {
            return getsampledataforsearch(datain);
        } else if (datain.method === "heartbeat") {
            return hearbeat();
        } else {
            return NoOp();
        }
    }

    function attachFileToRecord(datain) {
        celog(LOG_LEVEL_DEBUG, "attaching file", JSON.stringify(datain));
        var payload = datain.payload;
        var recordIdToAttach = payload.recordIdToAttach;
        var destRecordType = payload.destRecordType;
        var destRecordId = payload.destRecordId;
        if (recordIdToAttach == undefined || destRecordType == undefined || destRecordId == undefined) {
            return prepareErrorObject(STATUS_CODE.bad_request, "Required params missing")
        }
        try {
            Record.attach({
                record: {
                    type: "file",
                    id: recordIdToAttach
                },
                to: {
                    type: destRecordType,
                    id: destRecordId
                }
            });
        } catch (err) {
            celog(LOG_LEVEL_DEBUG, "error attach file", JSON.stringify(err));
            return prepareErrorObject(err.name, err);
        }
        celog(LOG_LEVEL_DEBUG, "attach file successful", JSON.stringify(payload));
        return payload;
    }

    /**
     * Summary. Function to handle bulk records
     *
     * datain. type: netsuite object and payload as array of objects.
     */
    function dobulkcreate(datain) {
        var objectsToCreate = datain.payload == undefined ? [] : datain.payload;
        var proceedOnError = datain.proceedOnErr == undefined ? false : datain.proceedOnErr == "true";
        var isObject = objectsToCreate instanceof Array;

        if (!isObject) {
            celog(LOG_LEVEL_DEBUG, BULK_ERROR, BULK_ERRORS.bulk_payload_error);
            return prepareErrorObject(STATUS_CODE.bad_request, BULK_ERRORS.bulk_payload_error);
        }

        var cerecordType = datain.recordtype.toLowerCase();
        var recordType = CE_OBJECT_TO_SUITE_OBJECT[cerecordType] || cerecordType;

        var results = [];
        for (var eachObjectIdx = 0; eachObjectIdx < objectsToCreate.length; eachObjectIdx++) {
            try {
                var payload = {
                    recordtype: recordType,
                    payload: objectsToCreate[eachObjectIdx]
                };
                var result = createRecord(payload);
                results.push(result);
            } catch (err) {
                celog(LOG_LEVEL_DEBUG, BULK_ERROR, err);
                throw err;
            }
        }
        results = processResultsForCESpec(results);
        return results;
    }

    function processResultsForCESpec(results) {
        var cespec_results = [];
        for (var recordIdx = 0; recordIdx < results.length; recordIdx++) {
            var cespec_result = results[recordIdx];

            if (cespec_result.hasOwnProperty("error")) {
                cespec_result["status"] = "skipped";
                cespec_result["reasons"] = JSON.stringify(cespec_result["error"]);
            } else {
                cespec_result["status"] = "created"
            }
            cespec_results.push(cespec_result);
        }
        return cespec_results;
    }

    /**
     * Summary. Sample function to see the search results.
     *
     * @param datain
     * @returns {Netsuite Records}
     */
    function getsampledataforsearch(datain) {
        var records = Search.create(datain).run().getRange({
            start: 0,
            end: 10
        });
        return records;
    }

    /**
     * Summary. gets all the lookup fields to send to a getall columns, these are the column names.
     *
     * @param datain - represents the payload
     * @returns {Array}
     */
    function getlookupfields(datain) {
        var result = [];
        try {
            var records = Search.create(datain).run().getRange({
                start: 0,
                end: 1
            })[0];

            var refrecord = {};
            refrecord.id = records.id;
            refrecord.type = datain.type;

            var record = Record.load(refrecord);

            if (records == null || records == undefined) {
                return prepareErrorObject(GENERIC_EXCEPTION, "records are null");
            }

            var fields = records.columns;
            var id = records.id;
            var fields = record.getFields();

            for (var fieldIdx = 0; fieldIdx < fields.length; fieldIdx++) {
                try {
                    var lookupfield = Search.lookupFields({
                        type: datain.type,
                        id: id,
                        columns: fields[fieldIdx]
                    });

                    result.push(Object.keys(lookupfield)[0]);
                } catch (err) {
                    if (err.name == "SSS_INVALID_SRCH_COL") {
                        //do nothing
                    } else {
                        return prepareErrorObject(err.name, err);
                    }
                }
            }

        } catch (err) {
            return prepareErrorObject(err.name, err);
        }

        return result;
    }

    /**
     *
     * Summary. Update an existing record.
     * Description. Loads a record and then updates the fields.
     *
     * @param datain
     * @return Id of the record.
     */
    function updateRecordById(datain) {
        var getRecordPayload = {};
        getRecordPayload.id = datain.id;
        getRecordPayload.type = datain.type;

        var payload = datain.payload;

        try {

            var recordholder = Record.load(getRecordPayload);

            for (var fieldname in payload) {
                if (payload.hasOwnProperty(fieldname)) {
                    var value = payload[fieldname];
                    if (value && typeof value != 'object') {
                        celog(LOG_LEVEL_DEBUG, "Creating Record Object", "Setting the values" + fieldname + ":::" + value);
                        recordholder.setValue({
                            fieldId: fieldname,
                            value: value
                        });
                    } else {
                        addLine(recordholder, fieldname, value);
                    }
                }
            }

            var record = recordholder.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
        } catch (err) {
            return prepareErrorObject(err.name, err);
        }

        var isErrorExists = record.error;
        if (isErrorExists != null && isErrorExists != undefined) {
            throw prepareErrorObject("RECORD_CREATION_FAILED", record);
        }

        var result = {};
        result.internalId = record;

        return result;
    }

    /**
     * Summary. Deletes a record in the Netsuite System.
     *
     * Description. type = netsuite record type., id = object ID or internal ID
     *
     * @param datain
     */
    function deleteById(datain) {
        try {
            var recordId = Record.delete({
                type: datain.type,
                id: datain.payload.id,
            });

            var result = {};
            result.internalId = recordId;
            return result;
        } catch (err) {
            var errorObject = {
                "error": {
                    "message": {
                        "details": ""
                    }
                }
            };
            errorObject.error.message.details = err.name || JSON.stringify(err);
            return errorObject;
        }
    }

    /**
     * Summary. Formats a record object to get the record values and sets the record values.
     *
     * @param record
     * @return {Object}
     */
    function formatRecord(record) {
        var object = new Object();
        object.id = record.id;
        //construct fields
        var fieldsList = record.getFields();
        for (var i = 0; i < fieldsList.length; i++) {
            var eachField = fieldsList[i];
            object[eachField] = record.getValue({
                fieldId: eachField
            });
        }
        // construct sublists
        var subLists = record.getSublists();
        for (var sublistIdx = 0; sublistIdx < subLists.length; sublistIdx++) {
            var eachSublistId = subLists[sublistIdx];
            var sublist = object[eachSublistId] || [];

            try {
                var linesCount = record.getLineCount({
                    sublistId: eachSublistId
                });

                var fieldsForSublist = record.getSublistFields({
                    sublistId: eachSublistId
                });

                for (var lineIdx = 0; lineIdx < linesCount; lineIdx++) {
                    var lineObject = {};
                    for (var fieldIdx = 0; fieldIdx < fieldsForSublist.length; fieldIdx++) {
                        var fieldOfaLine = fieldsForSublist[fieldIdx];
                        var valueOfEachFieldInLine = record.getSublistValue({
                            sublistId: eachSublistId,
                            fieldId: fieldsForSublist[fieldIdx],
                            line: lineIdx
                        });
                        lineObject[fieldOfaLine] = valueOfEachFieldInLine;
                        celog(LOG_LEVEL_DEBUG, "Sublist Value::" + eachSublistId, valueOfEachFieldInLine);
                    }
                    if (lineObject != null || lineObject != undefined) {
                        sublist.push(lineObject);
                    }
                }
            } catch (recordFormatErr) {
                celog(LOG_LEVEL_DEBUG, "Error occurred while converting sublist::" + eachSublistId, recordFormatErr);
            }
            object[eachSublistId] = sublist;
        }
        return object;
    }


    /**
     * Summary. logger utility to log statements with log level.
     * @param datain
     */
    function celog(loglevel, logtitle, logdetails) {
        if (loglevel == LOG_LEVEL_DEBUG) {
            log.debug({ title: logtitle, details: logdetails });
        }

        if (loglevel == LOG_LEVEL_ERROR) {
            log.error({ title: logtitle, details: logdetails });
        }
    }

    // reference function do not remove
    function performSearchById(datain) {
        var result = {};
        var options = {};
        options.type = datain.type;

        var filters = [
            ["internalId", Search.Operator.IS, datain.id]
        ];

        var columns = [
            "internalId", "parent", "category", "terms"
        ];

        options.filters = filters;
        options.columns = columns;

        var results = Search.create(options)
            .run()
            .getRange({
                start: 0,
                end: 1
            })[0];
        // if result is undefined then throw error that internal id is not found
        for (var j = 0; j < columns.length; j++) {
            var col = columns[j];
            result[col] = results.getValue({
                name: col
            });
        }
        return result;
    }

    return ACTIONS;
});
