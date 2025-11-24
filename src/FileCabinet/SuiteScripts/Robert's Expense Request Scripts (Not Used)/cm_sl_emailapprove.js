/**
*
* @NApiVersion 2.1
* @NScriptType Suitelet
*
*/

define(['N/runtime', 'SuiteScripts/cm_ce_expensereport.js', 'N/ui/serverWidget'],

    function callbackFunction(runtime, expense, ui) {


        function getFunction(context) {

            log.debug('parameters', JSON.stringify(context.request.parameters))

            expense.approveRequest(context.request.parameters['internalid'], context.request.parameters['userid'], 0, context.request.parameters['customapprove'], context.request.parameters['customdate'])

            var form = ui.createForm({ title: 'Approved', hideNavBar: true });

            form.clientScriptModulePath = 'SuiteScripts/cm_ce_expensereport.js';

            context.response.writePage(form);


        }

        function postFunction(context) {

            log.debug('POST Message', JSON.stringify(context.request.parameters))


            context.response.writePage('POST');

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

