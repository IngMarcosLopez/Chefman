/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord'],
    /**
     * @param{currentRecord} currentRecord
     */
    function (currentRecord) {

        function postSourcing(scriptContext) {
            if (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item') {
                scriptContext.currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'bomquantity',
                    value: componentyiel * quantity * 3,
                    displayType: "disabled",
                })
                log.debug({
                    title: 'BOM数量已默认',
                    details: 已经进行显示限制
                });

            }

        }

        return {
            postSourcing: postSourcing,
        };

    });
