/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/record', 'N/log'], function(record, log) {

    function beforeSubmit(context) {
        try {
            var newRecord = context.newRecord;

            // 确认是货品履行单据
            if (newRecord.type !== record.Type.ITEM_FULFILLMENT) {
                return;
            }

            var lineCount = newRecord.getLineCount({
                sublistId: 'line'
            });

            var totalExRate = 0;
            var cogsLineCount = 0;

            for (var i = 0; i < lineCount; i++) {
                var accountType = newRecord.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'accounttype',
                    line: i
                });

                if (accountType === 'COGS') {
                    var debitFxAmount = newRecord.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'debitfxamount',
                        line: i
                    }) || 0;

                    var debitAmount = newRecord.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'debitamount',
                        line: i
                    }) || 0;

                    var creditFxAmount = newRecord.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'creditfxamount',
                        line: i
                    }) || 0;

                    var creditAmount = newRecord.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'creditamount',
                        line: i
                    }) || 0;

                    var cogsAmount = newRecord.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'cogsamount',
                        line: i
                    }) || 0;

                    var exRate = 0;

                    if (debitAmount !== 0) {
                        exRate = Math.abs((debitFxAmount || -cogsAmount) / debitAmount);
                    } else if (creditAmount !== 0) {
                        exRate = Math.abs((creditFxAmount || -cogsAmount) / creditAmount);
                    }

                    totalExRate += exRate;
                    cogsLineCount++;
                }
            }

            if (cogsLineCount > 0) {
                var averageExRate = totalExRate / cogsLineCount;

                newRecord.setValue({
                    fieldId: 'custbody_inv_exrate',
                    value: averageExRate
                });
            }

        } catch (e) {
            log.error({
                title: 'Error in beforeSubmit',
                details: e
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});