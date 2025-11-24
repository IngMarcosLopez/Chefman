/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * Author           Date            Change Comments
 * Robert G         7/17/23         Initial Release       
 */
define(['N/record', 'N/search', 'N/url'],

    function (record, search, url) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        function rejectRequest(internalid, email, name) {

            log.debug({
                title: 'internalid/email',
                details: internalid + ' ' + email
            });
            var rejectWindow = window.open('https://7336086.app.netsuite.com/app/site/hosting/scriptlet.nl?script=1801&deploy=1&internalid=' + internalid + '&email=' + email + '&name=' + name, '_blank', 'true')
            rejectWindow.resizeTo(500, 700)


        }


        function approveRequest(internalid, userid, amount, customField, customDateField) {

            try {

                var expenseFields = search.lookupFields({
                    type: 'customrecord_cm_expensereport',
                    id: internalid,
                    columns: [customDateField]
                })

                var approval = expenseFields[customDateField] || false;

                if (!approval) {

                    log.debug('Approve Request', approval + '-' + internalid + '-' + userid + '-' + amount + '-' + customField + '-' + customDateField)
                    var expenseRecord = record.load({
                        type: 'customrecord_cm_expensereport',
                        id: internalid,
                        isDynamic: false,
                    });


                    expenseRecord.setValue({
                        fieldId: customField,
                        value: userid,
                        ignoreFieldChange: false
                    });
                    expenseRecord.setValue({
                        fieldId: customDateField,
                        value: new Date(),
                        ignoreFieldChange: false
                    });

                    expenseRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });

                }


                if (amount > 0) {
                    window.location.reload(true);
                }

            }
            catch (e) {

                log.error('approveReport Error', e);
                alert('Error Approving Expense Report \nPlease contact IT!')
            }

        }

        return {
            pageInit: pageInit,
            approveRequest: approveRequest,
            rejectRequest: rejectRequest,

        };

    });


