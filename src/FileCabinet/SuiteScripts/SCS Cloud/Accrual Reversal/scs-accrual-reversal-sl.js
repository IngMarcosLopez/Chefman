/**
 *
 * @author Kyle Lopes <kyle.lopes@scscloud.com>
 * @version 2022-12-05
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType Suitelet
 *
 **/

define(['N/ui/serverWidget', 'N/record', 'N/query', 'N/ui/message', 'N/http', 'SuiteScripts/SCS Cloud/Library/scs-library-2'],// TODO add SCSLibrary

    /**
     * 
     * @param {*} ui 
     * @param {*} record 
     * @param {*} query 
     * @param {*} message 
     * @param {*} http 
     * @param {*} scsLibrary 
     * @returns 
     */
    function (ui, record, query, message, http, scsLibrary) {
        const marketingAllowancesReservesAcc = 751;

        const messageOptions = {
            missing_mandatory_fields: {
                title: 'Warning',
                type: message.Type.WARNING,
                message: 'Please select a Customer and Account.',
                duration: 5000
            },
            creation_error: {
                title: 'Error',
                type: message.Type.ERROR,
                message: 'There was an error creating the Journal Entry.',
                duration: 5000
            },
            success: {
                title: 'Success',
                type: message.Type.CONFIRMATION,
                message: `Journal Entry/ies successfully created.`,
                duration: 5000
            },
            no_ar_accounts: {
                title: 'Warning',
                type: message.Type.WARNING,
                message: `There are no invoice accrual entries available to reverse for the selected customer.`,
                duration: 5000
            }
        }

        /**
         * Handles any incoming HTTP requests and routes the the appropriate method.
         *
         * @param {OnRequestContext} context
         */
        const onRequest = context => {

            let creationResult;
            if (context.request.method === 'POST') {

                const recordIds = createJournalEntry(context.request);

                if (recordIds) {
                    // context.response.sendRedirect({
                    //     type: http.RedirectType.RECORD,
                    //     identifier: record.Type.JOURNAL_ENTRY,
                    //     id: recordId
                    // });
                    creationResult = 'success';

                    messageOptions[creationResult].message = `Journal Entr${recordIds.length > 1 ? 'ies' : 'y'} successfully created.`;
                } else {
                    creationResult = 'creation_error';
                }
            }

            getForm(context, creationResult);

            log.debug('onRequest', {
                request: {
                    clientIpAddress: context.request.clientIpAddress,
                    url: context.request.url,
                    method: context.request.method,
                    parameters: context.request.parameters,
                },
            });
        }

        /**
         * Creates a form and displays all sales orders matching the input parameters.
         *
         * @param context
         * @param schedulingResult
         */
        const getForm = (context, message) => {

            const form = ui.createForm({
                title: 'Accrual Reversal'
            })
            form.clientScriptModulePath = './scs-accrual-reversal-ce.js';

            // Add buttons
            form.addSubmitButton({
                label: 'Submit',
            });

            // Initialise input variables
            const customerId = context.request.parameters.custpage_customer;
            const response = message || context.request.parameters.response_message;

            log.debug('filters', {
                customerId: customerId,
                response: response
            });

            if (response && messageOptions.hasOwnProperty(response)) {
                form.addPageInitMessage(messageOptions[response]);
            }

            // Add filters
            form.addFieldGroup({
                id: 'custpage_filters',
                label: 'Filters'
            });

            const customerField = form.addField({
                id: 'custpage_customer',
                type: ui.FieldType.SELECT,
                label: 'Customer',
                container: 'custpage_filters',
                source: 'customer'
            });

            customerField.isMandatory = true;
            if (customerId) customerField.defaultValue = customerId

            const sublist = form.addSublist({
                id: 'custpage_ar_accounts',
                type: ui.SublistType.LIST,
                label: 'Accrual Accounts',
            });

            sublist.addField({
                id: 'custpage_account',
                type: ui.FieldType.SELECT,
                label: 'Accrual Account',
                source: 'account'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            });

            sublist.addField({
                id: 'custpage_accrual_total',
                type: ui.FieldType.CURRENCY,
                label: 'Accrual Total'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.INLINE
            });

            sublist.addField({
                id: 'custpage_subsidiary',
                type: ui.FieldType.SELECT,
                label: 'Subsidiary',
                source: 'subsidiary'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            });

            sublist.addField({
                id: 'custpage_transfer_amount',
                type: ui.FieldType.CURRENCY,
                label: 'Transfer Amount'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.ENTRY
            });

            //amountToTransferField.isMandatory = true;

            // Run the search and display all results
            if (customerId) {
                // TODO add multiple lines for each accrual account 
                // TODO create multiple journals as needed. 
                const arAccounts = getArAccounts(customerId);

                if (arAccounts.length == 0) {
                    form.addPageInitMessage(messageOptions['no_ar_accounts']);
                    context.response.writePage(form);
                } else {
                    log.debug('accounts', { customerId: customerId, arAccounts: arAccounts });
                    const results = getAmountAndSubsidiary(customerId, arAccounts);

                    let subsidiary = results[0].subsidiary;

                    if (!subsidiary) subsidiary = getSubsidiary(customerId, arAccounts);

                    for (let i = 0; i < results.length; i++) {
                        sublist.setSublistValue({
                            id: 'custpage_account',
                            line: i,
                            value: results[i].account
                        });

                        sublist.setSublistValue({
                            id: 'custpage_subsidiary',
                            line: i,
                            value: subsidiary
                        });

                        sublist.setSublistValue({
                            id: 'custpage_accrual_total',
                            line: i,
                            value: Math.abs(results[i].totalamount) || 0.00
                        });
                    }
                }
            }

            context.response.writePage(form);
        }

        /**
         * Creates a Journal Entry based off the information supplied in the Suitelet
         * @param {object} request 
         * @returns 
         */
        const createJournalEntry = request => {
            const ACCOUNTS_RECEIVABLE = 119;

            const entity = request.parameters.custpage_customer;
            const journalEntryIds = [];

            for (let i = 0; i < request.getLineCount({ group: 'custpage_ar_accounts' }); i++) {
                //const select = request.getSublistValue({ group: 'custpage_ar_accounts', name: 'custpage_select', line: i });
                const amount = scsLibrary.parseFloat(request.getSublistValue({ group: 'custpage_ar_accounts', name: 'custpage_transfer_amount', line: i }));
                const subsidiary = scsLibrary.parseInt(request.getSublistValue({ group: 'custpage_ar_accounts', name: 'custpage_subsidiary', line: i }));
                const arAccount = scsLibrary.parseInt(request.getSublistValue({ group: 'custpage_ar_accounts', name: 'custpage_account', line: i }));

                log.debug('vars', {
                    //select: select,
                    amount: amount,
                    subsidiary: subsidiary,
                    arAccount: arAccount
                });

                if (!amount) continue;

                const journalEntry = record.create({
                    type: record.Type.JOURNAL_ENTRY,
                    isDynamic: true
                });

                journalEntry.setValue({ fieldId: 'subsidiary', value: subsidiary });
                journalEntry.setValue({ fieldId: 'memo', value: `Accrual Reversal` });

                journalEntry.selectNewLine({ sublistId: 'line' });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: arAccount });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: amount });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity });

                journalEntry.commitLine({ sublistId: 'line' });

                journalEntry.selectNewLine({ sublistId: 'line' });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: ACCOUNTS_RECEIVABLE });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: amount });
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity });

                journalEntry.commitLine({ sublistId: 'line' });

                const journalEntryId = journalEntry.save({ ignoreMandatoryFields: true });

                log.audit('Journal Entry Successfully Created', {
                    journalEntry: journalEntryId,
                });

                journalEntryIds.push(journalEntryId);
            }

            log.debug('journalEntryIds', {
                journalEntryIds: journalEntryIds,
                length: journalEntryIds.length
            });

            return journalEntryIds;
        }

        /**
         * This gets what is in the account as well as the subsidiary for that Entity. Customer wants to be able to transfer 
         * an amount out of the Accrual Account. 
         * 
         * @param {int} customer 
         * @param {int} account 
         * @returns 
         */
        const getAmountAndSubsidiary = (customerId, arAccounts) => {

            if (arAccounts.length == 0) return false;

            const results = query.runSuiteQL(`
                SELECT SUM(tal.amount) totalamount,
                       MAX(esr.subsidiary) subsidiary,
                       tal.account

                FROM transaction t
                JOIN transactionline tl ON tl.transaction = t.id
                JOIN transactionaccountingline tal ON t.id = tal.transaction AND tal.transactionline = tl.id
                JOIN entitysubsidiaryrelationship esr ON tl.entity = esr.entity

                WHERE tl.entity = ${customerId}
                AND   tal.account IN (${arAccounts.join(', ')})

                GROUP BY tal.account
            `).asMappedResults();

            return results;
        }

        const getSubsidiary = (customerId, arAccounts) => {
            let subsidiary = 0;

            const results = query.runSuiteQL(`
                SELECT  tl.subsidiary

                FROM transaction t
                JOIN transactionline tl ON tl.transaction = t.id
                JOIN transactionaccountingline tal ON t.id = tal.transaction AND tal.transactionline = tl.id

                WHERE tl.entity = ${customerId}
                AND   tal.account IN (${arAccounts.join(', ')})
                AND   t.createddate = (SELECT MIN(t.createddate) 
                                        
                                        FROM transaction t
                                        JOIN transactionline tl ON tl.transaction = t.id
                                        JOIN transactionaccountingline tal ON t.id = tal.transaction AND tal.transactionline = tl.id
                                        
                                        WHERE tl.entity = ${customerId}
                                        AND   tal.account IN (${arAccounts.join(', ')})
                                      )
            `).asMappedResults();

            if (results && results.length > 0) {
                subsidiary = results[0].subsidiary;
            }

            return subsidiary;
        }

        /**
         * 
         * 
         * @param {int} customer 
         * @returns {array}
         */
        const getArAccounts = (customerId) => {
            const arAccounts = [];

            const results = query.runSuiteQL(`
                SELECT  ia.custrecord_ia_ar_account araccount,

                FROM customrecord_invoice_accrual ia

                WHERE ia.custrecord_ia_customer = ${customerId}
            `).asMappedResults();

            for (let i in results) {
                arAccounts.push(results[i].araccount);
            }

            return arAccounts;
        }

        return {
            onRequest: onRequest
        };
    });
