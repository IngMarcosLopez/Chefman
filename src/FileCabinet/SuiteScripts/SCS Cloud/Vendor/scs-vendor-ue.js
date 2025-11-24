/**
 * @author Meir Bensabat <meir@scscloud.com>
 * @version 2024-1-4
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/record', 'N/redirect', 'N/url', 'N/query', 'N/search'],
function (record, redirect, url, query, search) {
        
    function afterSubmit (context) {
        if (context.type == "create" || context.type == "edit") {
            handleSubsidiaries(context);
        }
    }

    function handleSubsidiaries (context) {
        
        try {
            var subsidiaryArray = getSubsidiariesToAdd(context);
            var vendorId = context.newRecord.id;


            // load record
            var vendorRecord = record.load({
                type: record.Type.VENDOR,
                id: vendorId,
                isDynamic: true
            });

            for (var index = 0; index < subsidiaryArray.length; index++) {

                vendorRecord.selectNewLine({
                    sublistId: 'submachine'
                });

                vendorRecord.setCurrentSublistValue({
                    sublistId: 'submachine',
                    fieldId: 'subsidiary',
                    value: subsidiaryArray[index]
                });

                vendorRecord.commitLine({
                    sublistId: 'submachine'
                });                     
            };

            vendorRecord.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });

            

        }
        catch (error) {
            log.error('Error setting subsidiaries', error);
        }
    }
    

    function getSubsidiariesToAdd (context) {

        var vendorId = context.newRecord.id;

        var queryResults = query.runSuiteQL(`
        SELECT sub.id, sub.name, vsr.subsidiary, vsr.isPrimarySub, vsr.entity
        FROM Subsidiary sub
            LEFT JOIN VendorSubsidiaryRelationship vsr 
                ON vsr.subsidiary = sub.id 
                AND vsr.entity = ${vendorId}
        WHERE
            sub.isInactive = 'F'
            AND sub.isElimination = 'F'

            


        `).asMappedResults();

        var subsidiaryArray = [];

        for (index = 0; index < queryResults.length; index++) {
            if (queryResults[index].subsidiary == null) {
                subsidiaryArray.push(queryResults[index].id);
            }
        }

        log.debug('subsidiaryArray', JSON.stringify(subsidiaryArray));

        return subsidiaryArray;
    }

    return {
        afterSubmit: afterSubmit
    };
});