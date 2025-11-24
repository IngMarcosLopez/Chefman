/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * Author           Date            Change Comments
 * Robert G         7/17/23         Initial Release       
 */
define(['N/record', 'N/email', 'N/url', 'N/runtime'],

    function (record, email, url, runtime) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

            email.send({
                author: runtime.getCurrentUser().id,
                body: 'Rejection Reason: \n' + scriptContext.currentRecord.getValue('custpage_message'),
                recipients: [scriptContext.currentRecord.getValue('custpage_email'), runtime.getCurrentUser().email, 'rgreen@chefman.com'],
                subject: scriptContext.currentRecord.getValue('custpage_name') + ' Your Expense Request has been Rejected',
            });

            console.log('Save Record')
            console.log(JSON.stringify(scriptContext))
            log.debug('save record', JSON.stringify(scriptContext))
            window.open('','_self').close()
            return false
        }



        return {
            saveRecord: saveRecord,

        };

    });


