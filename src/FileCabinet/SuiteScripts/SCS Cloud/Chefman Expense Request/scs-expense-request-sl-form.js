/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(["N/record", "N/ui/serverWidget", "N/file", "N/redirect", "N/ui/message"], 
    function(record, serverWidget, file, redirect, message) {

    const DOC_UPLOAD_FOLDER = 2494;

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var form = handleGetRequest(context);
            context.response.writePage({
                pageObject: form
            });
        } else if (context.request.method === 'POST') {
            try {
                handlePostRequest(context);

                redirect.toSuitelet({
                    deploymentId: 'customdeploy_scs_cm_expense_request_sl',
                    scriptId: 'customscript_scs_cm_expense_request_sl',
                    isExternal: true,
                    parameters: {
                        message: "Request submitted successfully.",
                        success: true
                    }
                });
            }
            catch (error) {
                log.error({ title: 'handlePostRequest Error', details: error });
                redirect.toSuitelet({
                    deploymentId: 'customdeploy_scs_cm_expense_request_sl',
                    scriptId: 'customscript_scs_cm_expense_request_sl',
                    isExternal: true,
                    parameters: {
                        message: "Error submitting request. Please contact your NetSuite administrator.",
                        success: false
                    }
                });
            }  
        }
    }

    function handleGetRequest(context) {
        // Handle GET request logic here
        try {
            var formObject = buildForm(context);
            return formObject;
        }
        catch (error) {
            log.error({ title: 'handleGetRequest Error', details: error });
        }
    }

    function handlePostRequest(context) {
        // Handle POST request logic here
        try {
            var recordId = createExpenseRequestRecord(context);
        }
        catch (error){
            log.error({ title: 'handlePostRequest Error', details: error });
        }
    }

    /**
     * Use all the data from the form to create a new Chefman Expense Request record.
     * Attach files to the record using standard file attachment.
     * 
     * @param {*} context 
     */
    function createExpenseRequestRecord(context) {
        var expenseRequestRecord = record.create({
            type: 'customrecord_cm_expensereport',
            isDynamic: true
        });

        // Get all the fields from the form
        var formFields = context.request.parameters;

        // Set the fields on the record
        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_firstname',
            value: formFields.custpage_first_name
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_lastname',
            value: formFields.custpage_last_name
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_email',
            value: formFields.custpage_email
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_amount',
            value: formFields.custpage_expense_amount
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_vendorname',
            value: formFields.custpage_vendor_name
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_expense_description',
            value: formFields.custpage_expense_description
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_describewhyexpenseneeded',
            value: formFields.custpage_expense_necessity
        });

        expenseRequestRecord.setValue({
            fieldId: 'custrecord_cm_listcompetingquotes',
            value: formFields.custpage_competing_quotes
        });

        // Save the record
        var expenseRequestRecordId = expenseRequestRecord.save();

        // Set Attachments Fields
        var uploadedFilesObj = context.request.files;

        // If File is provided and under File Limit size upload to File Cabinet
        for (var fileParameterKey in uploadedFilesObj) {
            if (uploadedFilesObj[fileParameterKey].size < 10485760) {
                var fileObject = uploadedFilesObj[fileParameterKey];
                fileObject.folder = DOC_UPLOAD_FOLDER;
                var fileId = fileObject.save();

                attachFileToRecord(fileId, expenseRequestRecordId);
            } else {
                throw errorModule.create({
                    name: "FILE_SIZE_EXCEEDS_LIMIT",
                    message:
                        "File Size needs to be under 10485760. File - " +
                        uploadedFilesObj[fileParameterKey].name +
                        " size is " +
                        uploadedFilesObj[fileParameterKey].size,
                    notifyOff: true,
                });
            }
        }
    }

    /**
     * First, create the file and save it in the File Cabinet
     * Then, attach the file to the record
     * 
     * @param {*} fileParameter 
     * @param {*} recordId 
     */
    function attachFileToRecord(fileId, recordId) {
        record.attach({
            record: {
                type: 'file',
                id: fileId
            },
            to: {
                type: 'customrecord_cm_expensereport',
                id: recordId
            }
        });
    }



    /**
     * Build the form to expose fields mirroring the Chefman Expense Request record.
     * 
     * @param {*} context 
     */
    function buildForm(context) {
        // Create form object
        var form = serverWidget.createForm({
            title: 'Chefman Expense Request'
        });

        form.clientScriptModulePath = 'SuiteScripts/SCS Cloud/Chefman Expense Request/scs-expense-request-cs.js';

        var messageText = context.request.parameters.message;
        var success = context.request.parameters.success;

        if (messageText && success == "true") {
            form.addPageInitMessage({
                type: message.Type.CONFIRMATION,
                title: 'Success',
                message: messageText
            });
        }

        if (messageText && success != "true") {
            form.addPageInitMessage({
                type: message.Type.ERROR,
                title: 'Error',
                message: messageText
            });
        }

        // Add submit button
        form.addSubmitButton({
            label: 'Submit'
        });

        // Add first name field
        var firstNameField = form.addField({
            id: 'custpage_first_name',
            type: serverWidget.FieldType.TEXT,
            label: 'First Name'
        }).isMandatory = true;

        // Last Name
        var lastNameField = form.addField({
            id: 'custpage_last_name',
            type: serverWidget.FieldType.TEXT,
            label: 'Last Name'
        }).isMandatory = true;

        // Email
        var emailField = form.addField({
            id: 'custpage_email',
            type: serverWidget.FieldType.EMAIL,
            label: 'Email'
        }).isMandatory = true;

        // Expense Amount
        var expenseAmountField = form.addField({
            id: 'custpage_expense_amount',
            type: serverWidget.FieldType.CURRENCY,
            label: 'Expense Amount (Min. $5000)'
        }).isMandatory = true;

        // Vendor Name
        var vendorNameField = form.addField({
            id: 'custpage_vendor_name',
            type: serverWidget.FieldType.TEXT,
            label: 'Vendor Name'
        }).isMandatory = true;

        // Expense Description
        var expenseDescriptionField = form.addField({
            id: 'custpage_expense_description',
            type: serverWidget.FieldType.TEXTAREA,
            label: 'Expense Description'
        }).isMandatory = true;

        // Why is the expense necessary?
        var expenseNecessityField = form.addField({
            id: 'custpage_expense_necessity',
            type: serverWidget.FieldType.TEXTAREA,
            label: 'Why is the expense necessary?'
        }).isMandatory = true;

        // Competing Quotes
        var competingQuotesField = form.addField({
            id: 'custpage_competing_quotes',
            type: serverWidget.FieldType.TEXTAREA,
            label: 'Competing Quotes'
        }).isMandatory = true;

        // Attachment 1
        var attachment1Field = form.addField({
            id: 'custpage_attachment_1',
            type: serverWidget.FieldType.FILE,
            label: 'Attachment 1'
        });

        // Attachment 2
        var attachment2Field = form.addField({
            id: 'custpage_attachment_2',
            type: serverWidget.FieldType.FILE,
            label: 'Attachment 2'
        });

        // Attachment 3
        var attachment3Field = form.addField({
            id: 'custpage_attachment_3',
            type: serverWidget.FieldType.FILE,
            label: 'Attachment 3'
        });


        return form;
    }

    return {
        onRequest: onRequest
    };
});
