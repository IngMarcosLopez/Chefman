/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 * Author           Date            Change Comments
 * Robert G         7/17/23         Initial Release                                  
 */
define(['N/record', 'N/email', 'N/url', 'N/runtime', 'N/file', 'N/search', 'N/render'], function (record, email, url, runtime, file, search, render) {

    function beforeLoad(context) {


        try {

            /*
            var amount = context.newRecord.getValue({
                fieldId: 'custrecord_cm_amount'
            });

            var excutiveApproval = context.newRecord.getValue({
                fieldId: 'custrecord_cm_executiveapproval'
            }) || false;

            var financeApproval = context.newRecord.getValue({
                fieldId: 'custrecord_cm_financeapproval'
            }) || false

            if (context.type == 'view' && runtime.getCurrentUser().role == 3 && (amount > 10000 && !excutiveApproval) || (amount > 5000 && amount < 10000 && !excutiveApproval && !financeApproval)) {

                log.debug('Before Load -> User Data', JSON.stringify(runtime.getCurrentUser()))

                var buttonLabel = amount > 10000 && financeApproval ? 'Excutive Approval' : 'Finance Approval';

                var customField = amount > 10000 && financeApproval ? 'custrecord_cm_executiveapproval' : 'custrecord_cm_financeapproval';

                var customDateField = amount > 10000 && financeApproval ? 'custrecord_cm_executiveapprovaldate' : 'custrecord_cm_financeapprovedate';


                context.form.addButton({
                    id: 'custpage_cm_reject',
                    label: 'Reject',
                    functionName: "rejectRequest(" + context.newRecord.id + ',' + JSON.stringify(context.newRecord.getValue({
                        fieldId: 'custrecord_cm_email'
                    })) + ',' + JSON.stringify(context.newRecord.getValue({
                        fieldId: 'custrecord_cm_firstname'
                    }) + ' ' + context.newRecord.getValue({
                        fieldId: 'custrecord_cm_lastname'
                    })) + ")"
                });

                context.form.addButton({
                    id: 'custpage_cm_approve',
                    label: buttonLabel,
                    functionName: "approveRequest(" + context.newRecord.id + ',' + runtime.getCurrentUser().id + ',' + context.newRecord.getValue({
                        fieldId: 'custrecord_cm_amount'
                    }) + ',' + JSON.stringify(customField) + ',' + JSON.stringify(customDateField) + ")"
                });


                context.form.clientScriptModulePath = "SuiteScripts/Robert's Expense Request Scripts (Not Used)/cm_ce_expensereport.js";

                
            }
            */
        } catch (error) {
            log.error('Before Load -> Error', error)
        }


    }


    function afterSubmit(context) {

        try {
            /*
            var current_Record = context.newRecord;
            var amount = current_Record.getValue({
                fieldId: 'custrecord_cm_amount'
            });

            var financeApproval = current_Record.getValue('custrecord_cm_financeapproval') || false;
            var excutiveApproval = current_Record.getValue('custrecord_cm_executiveapproval') || false;
            var employeeName = current_Record.getValue('custrecord_cm_firstname') + ' ' + current_Record.getValue('custrecord_cm_lastname');
            employeeName = employeeName.toUpperCase()

            var recipients = ['rgreen@chefman.com', 'jrosenberg@chefman.com', current_Record.getValue('custrecord_cm_email')] //, employeeFields.email, getSupervisorEmail(employeeFields.supervisor.value)];

            log.debug('approval scripts', runtime.getCurrentScript().getParameter({ name: 'custscript_cm_approvalscript' }) + '\n' + runtime.getCurrentScript().getParameter({ name: 'custscript_cm_approvaldeployment' }))

            var approvalURL = url.resolveScript({
                scriptId: runtime.getCurrentScript().getParameter({ name: 'custscript_cm_approvalscript' }),
                deploymentId: 1,
                returnExternalUrl: true
            });

            if (amount > 10000 && financeApproval) {
                approvalURL = approvalURL + '&internalid=' + current_Record.id + '&userid=' + 1564 + '&customapprove=custrecord_cm_executiveapproval&customdate=custrecord_cm_executiveapprovaldate';
                recipients.push('rnewhouse@chefman.com')
            }
            else {
                approvalURL = approvalURL + '&internalid=' + current_Record.id + '&userid=' + -5 + '&customapprove=custrecord_cm_financeapproval&customdate=custrecord_cm_financeapprovedate';
            }

            if (current_Record.getValue('custrecord_cm_sendinitialemail')) {

                log.debug({
                    title: 'After Submit -> ',
                    details: ' Send initial Email \n' + employeeName
                });

                sendEmail(recipients, current_Record, employeeName, approvalURL);

            }

            log.debug('email conditions', amount + '-' + financeApproval + '-' + excutiveApproval)


            if (context.type == 'edit' && amount > 10000 && financeApproval && !excutiveApproval) {
                sendEmail(recipients, current_Record, employeeName, approvalURL, true);
            }
            else if (context.type == 'edit' && (amount > 5000 && amount < 10000 && financeApproval)) {
                sendEmail(recipients, current_Record, employeeName, false, true);
            }
            else if (context.type == 'edit' && amount > 10000 && financeApproval && excutiveApproval) {
                sendEmail(recipients, current_Record, employeeName, false, true);
            }

            */
        } catch (error) {
            log.error('After Submit -> Error', error)
        }
    }

    /*
    function sendEmail(recipients, current_Record, employeeName, approvalURL, finalEmail) {


        log.debug({
            title: 'After Submit -> Email',
            details: current_Record.id + '\n' + JSON.stringify(current_Record)
        });

        var scheme = 'https://';
        var host = url.resolveDomain({
            hostType: url.HostType.APPLICATION
        });
        var expense_link = url.resolveRecord({
            recordType: 'customrecord_cm_expensereport',
            recordId: current_Record.id,
            isEditMode: false
        });

        var myURL = scheme + host + expense_link;


        var mergeResult = render.mergeEmail({
            templateId: runtime.getCurrentScript().getParameter({ name: 'custscript_cm_emailTemplate' }),
            entity: null,
            recipient: null,
            supportCaseId: null,
            transactionId: null,
            customRecord: {
                type: 'customrecord_cm_expensereport',
                id: current_Record.id
            }
        });

        var attachmentsArray = [];
        var customrecord_cm_expensereportSearchObj = search.create({
            type: "customrecord_cm_expensereport",
            filters:
                [
                    ["internalid", "anyof", current_Record.id],
                    "AND",
                    ["file.internalid", "noneof", "@NONE@"]

                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        join: "file",
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "internalid",
                        join: "file",
                        label: "Internal ID"
                    })
                ]
        });
        var searchResultCount = customrecord_cm_expensereportSearchObj.runPaged().count;
        log.debug("customrecord_cm_expensereportSearchObj result count", searchResultCount);
        customrecord_cm_expensereportSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results


            log.debug("customrecord_cm_expensereportSearchObj result ", JSON.stringify(result));

            var fileObj = file.load({
                id: result.getValue({
                    name: "internalid",
                    join: "file",
                })
            });

            attachmentsArray.push(fileObj)


            return true;
        });

        var emailBody = mergeResult.body;

        emailBody = emailBody.replace('{link}', myURL);

        if (approvalURL) {
            log.debug('approvalURL', approvalURL)
            emailBody = emailBody.replace('{approvallink}', approvalURL)
        }
        else {
            emailBody = emailBody.replace('<a href="{approvallink}" style="padding: 8px 12px; border: 1px solid #187bf2;border-radius: 2px;font-family: Arial, Helvetica, sans-serif;font-size: 14px; color: #ffffff;text-decoration: none;font-weight:bold;display: inline-block;">Approve</a>', ' ')
        }

        email.send({
            author: runtime.getCurrentScript().getParameter({ name: 'custscript_cm_defaultuser' }),
            recipients: recipients,
            subject: finalEmail ? 'Approved by ' + runtime.getCurrentUser().name : 'New' + ' Expense Report ' + employeeName,
            body: emailBody,
            attachments: attachmentsArray,
            relatedRecords: {
                customRecord: {
                    id: current_Record.id,
                    recordType: current_Record.getValue('rectype')
                }
            }

        });

        log.debug({
            title: 'After Submit -> Email Body',
            details: emailBody
        });
    }
    */

    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    }
});


