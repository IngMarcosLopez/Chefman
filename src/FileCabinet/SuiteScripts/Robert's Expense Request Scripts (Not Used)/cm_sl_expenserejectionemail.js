/**
*
* @NApiVersion 2.1
* @NScriptType Suitelet
*
*/

define(['N/email', 'N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget'],

    function callbackFunction(email, record, search, runtime, ui) {


        function getFunction(context) {

            log.debug('parameters', JSON.stringify(context.request.parameters))

            var form = ui.createForm({
                title: 'Expense Request Rejection',
                hideNavBar: true
            });

            form.clientScriptModulePath = 'SuiteScripts/cm_ce_rejectemail.js';



            form.addField({
                id: 'custpage_internalid',
                label: ' ',
                type: ui.FieldType.LABEL
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = fnblank(context.request.parameters['internalid']);

            form.addField({
                id: 'custpage_name',
                label: 'Employee Name',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            }).updateBreakType({
                breakType: ui.FieldBreakType.STARTCOL
            }).defaultValue = fnblank(context.request.parameters['name']).toUpperCase();

            form.addField({
                id: 'custpage_email',
                label: 'Employee Email',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            }).defaultValue = fnblank(context.request.parameters['email']);


            var field = form.addField({
                id: 'custpage_message',
                label: 'Message',
                type: ui.FieldType.TEXTAREA
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.ENTRY
            });


            field.isMandatory = true;


            form.addSubmitButton({
                label: 'Send Email'
            })


            context.response.writePage(form);

        }

        function fnblank(aa) {
            if (aa == null || aa == '')
                return ' ';
            return aa;

        }


        function postFunction(context) {

            log.debug('POST Email Message', JSON.stringify(context.request.parameters))

            log.debug('POST Email Message', context.request.parameters['custpage_message'] + ' ' + context.request.parameters['custpage_email'] + ' ' + context.request.parameters['custpage_name'])

            email.send({
                author: runtime.getCurrentUser().id,
                body: 'Rejection Reason: \n' + context.request.parameters['custpage_message'],
                recipients: [context.request.parameters['custpage_email'], runtime.getCurrentUser().email, 'rgreen@chefman.com'],
                subject: context.request.parameters['name'] + ' Your Expense Request has been Rejected',
            })

            context.response.writePage(' ');

        }

        function onRequestFxn(context) {

            try {

                log.debug('onRequestFxn', JSON.stringify(context))
                if (context.request.method === "GET") {
                    getFunction(context)
                }
                else {
                    postFunction(context)
                }
            } catch (error) {
                log.error('Error', error)
            }


        }
        return {
            onRequest: onRequestFxn
        };
    });

