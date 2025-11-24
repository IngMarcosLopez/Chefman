
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(["N/search"], function(search) {
    function beforeLoad(context) {
        // TODO: Implement beforeLoad logic
    }
    
    function beforeSubmit(context) {
        // TODO: Implement beforeSubmit logic
        if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {
            setNetSuiteEmployee(context);
        }
    }
    
    function afterSubmit(context) {
        // TODO: Implement afterSubmit logic
    }

    /**
     * Find the matching NetSuite employee record by email address field custrecord_cm_email
     * 
     * @param {*} context 
     */
    function setNetSuiteEmployee (context) {
        try {
            var currentRecord = context.newRecord;
            var employeeEmail = currentRecord.getValue('custrecord_cm_email');
            var employeeSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [
                    search.createFilter({
                        name: 'email',
                        operator: search.Operator.IS,
                        values: employeeEmail
                    })
                ],
                columns: [
                    search.createColumn({
                        name: 'internalid'
                    }),
                    search.createColumn({
                        name: 'supervisor'
                    }),
                    search.createColumn({
                        name: 'department'
                    }),
                ]
            });
            var employeeSearchResults = employeeSearch.run().getRange({
                start: 0,
                end: 1
            });
            if (employeeSearchResults.length > 0) {
                var employeeInternalId = employeeSearchResults[0].id;
                var employeeSupervisorId = employeeSearchResults[0].getValue('supervisor');
                var departmentId = employeeSearchResults[0].getValue('department');

                log.debug("employeeInternalId", employeeInternalId);
                log.debug("employeeSupervisorId", employeeSupervisorId);
                log.debug("departmentId", departmentId);
                

                currentRecord.setValue({
                    fieldId: 'custrecord_cm_nsemployee',
                    value: employeeInternalId
                });
                currentRecord.setValue({
                    fieldId: 'custrecord_cm_supervisor',
                    value: employeeSupervisorId
                });
                currentRecord.setValue({
                    fieldId: 'custrecord_cm_department',
                    value: departmentId
                });
            }
        }
        catch (error) {
            log.error({
                title: 'Error setting NetSuite employee',
                details: error
            });
        }
    }
    
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});
