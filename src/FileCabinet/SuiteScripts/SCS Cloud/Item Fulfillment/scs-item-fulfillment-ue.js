/**
 * @author Meir Bensabat <meir@scscloud.com>
 * @version 2024-04-03
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/record', 'N/query', '../Library/scs-library-2', 'N/url', 'N/https'],

/**
 * 
 * @param {*} record 
 * @param {*} query 
 * @param {*} scsLibrary 
 * @returns {{afterSubmit: afterSubmit}}
 */
(record, query, scsLibrary, url, https) => {

    var OBJ_IF_UE = {};
    OBJ_IF_UE.SUBSIDIARIES_FOR_AUTO_INVOICE = [
        "4", //RJ_BRANDS
        //"7", //CHEF_IQ
        //"8", //CHEFMAN_DIRECT
        //"31", // CHEFMAN_CANADA
        "13", //CHEFMAN_UK
        "30", //Chefman Europe B.V.
    ];

    OBJ_IF_UE.APPROVAL_STATUS = {
        APPROVED: 2,
    };



    function afterSubmit (context)  {
        try {

            log.debug('afterSubmit', 'context.type: ' + context.type);

            const TEST_MODE = false;

            if (context.type == context.UserEventType.CREATE || (TEST_MODE && context.type == context.UserEventType.EDIT)) {
                // Transform the Sales Order to an Invoice if Item Fulfillment is shipped
                transformSalesOrderToInvoice(context);
            }

        } catch (error) {
            log.error('afterSubmit', error.toJSON ? error : error.toString());
        }
    }

    function transformSalesOrderToInvoice (context) {
        try {
            var suiteletURL = url.resolveScript({
                scriptId: 'customscript_scs_auto_invoice_from_if_sl',
                deploymentId: 'customdeploy_scs_auto_invoice_from_if_sl',
                returnExternalUrl: true,
                params: {
                    if_id: context.newRecord.id
                }
            });

            

            log.debug('transformSalesOrderToInvoice', 'suiteletURL: ' + suiteletURL);

            var response = https.post({
                url: suiteletURL
            });

            log.audit('transformSalesOrderToInvoice', 'response: ' + response.body);
        }
        catch (error) {
            log.error('transformSalesOrderToInvoice', error);
        }
    }
    return {
        afterSubmit: afterSubmit
    };
});