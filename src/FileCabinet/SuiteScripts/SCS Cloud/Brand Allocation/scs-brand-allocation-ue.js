/**
 * @author Kyle Lopes <kyle.lopes@scscloud.com>
 * @version 2022-12-13 
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/record', 'N/query', '../Library/scs-library-2'],

    /**
     * 
     * @param {*} record 
     * @param {*} query 
     * @param {*} scsLibrary 
     * @returns {{afterSubmit: afterSubmit}}
     */
    (record, query, scsLibrary) => {

        const afterSubmit = context => {
            try {

                if (context.type == context.UserEventType.EDIT) {
                    createJournalEntry(context.newRecord);
                }

            } catch (error) {
                log.error('afterSubmit', error.toJSON ? error : error.toString());
            }
        }

        /**
         * This function is to split the costs of a Bill over the different Subsidiaries. This is done using an
         * Advanced Journal Entry Record
         * @param {*} newRecord 
         * @returns {null}
         */
        const createJournalEntry = (newRecord) => {
            const lineBrandAllocations = [];
            const recordSubsidiary = newRecord.getValue({ fieldId: 'subsidiary' });

            const tranId = newRecord.getValue({ fieldId: 'tranid' });
            const bodyBrandAllocation = newRecord.getValue({ fieldId: 'custbody_brand_allocation' });

            const recordAccount = recordMap(newRecord.type) ? recordMap(newRecord.type) : newRecord.getValue({ fieldId: 'account' });

            if (!bodyBrandAllocation) {
                for (let i = 0; i < newRecord.getLineCount({ sublistId: 'line' }); i++) {
                    const brandAllocationLine = newRecord.getSublistValue({ sublistId: 'line', fieldId: 'custcol_brand_allocation', line: i });
                    if (brandAllocationLine && !lineBrandAllocations.includes(brandAllocationLine)) lineBrandAllocations.push(brandAllocationLine);
                }
            }

            if (!bodyBrandAllocation && lineBrandAllocations.length == 0) return;

            const allocationLines = getBrandAllocationLines(bodyBrandAllocation, lineBrandAllocations, recordSubsidiary);
            const accountingLines = getTransactionAccountingLines(newRecord.id);

            if (!allocationLines || allocationLines.length == 0) {
                log.error('NO_RESULTS', 'No Brand Allocation lines found');
                return;
            }

            log.debug('Variables', {
                recordId: newRecord.id,
                recordType: newRecord.type,
                recordAccount: recordAccount,
                recordSubsidiary: recordSubsidiary,
                bodyBrandAllocation: bodyBrandAllocation,
                lineBrandAllocations: lineBrandAllocations,
                brandAllocations: allocationLines,
                accountingLines: accountingLines
            });

            const total = getGLImpactTotal(accountingLines);
            const splitDebit = determineSplitType(accountingLines, newRecord.type);

            const journalEntry = record.create({
                type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                isDynamic: true
            });

            journalEntry.setValue({ fieldId: 'subsidiary', value: recordSubsidiary });
            journalEntry.setValue({ fieldId: 'memo', value: `${tranId} - Brand Allocation Journal` });
            journalEntry.setValue({ fieldId: 'custbody_created_from_transaction', value: newRecord.id });

            // This first set of Journal Lines reverses the full cost to the Subsidiary on the record.
            // for (let i = 0; i < accountingLines.length; i++) {
            //     // Reversing this account is not needed
            //     if (accountingLines[i].account == recordAccount) continue;

            //     const journalEntryLine = {
            //         recordSubsidiary: recordSubsidiary,
            //         subsidiary: recordSubsidiary,
            //         account: accountingLines[i].account,
            //         entity: accountingLines[i].entity,
            //         memo: accountingLines[i].memo,
            //         class: accountingLines[i].class,
            //         department: accountingLines[i].department,
            //         location: accountingLines[i].location,
            //         debit: accountingLines[i].credit, // swapped here to reverse the transaction
            //         credit: accountingLines[i].debit
            //     };

            //     createJournalEntryLine(journalEntry, journalEntryLine);
            // }

            // Each Subsidiary needs at least debit and a credit line for this type of record. Each Subsidiary needs to balance as well as the Journal Balancing
            // These Journal Entry lines split the cost over the different companies
            for (let i = 0; i < allocationLines.length; i++) {
                if (!allocationLines[i].subsidiary || !allocationLines[i].account || !allocationLines[i].percent) continue;

                for (let j = 0; j < accountingLines.length; j++) {
                    if (accountingLines[j].account == recordAccount) continue;
                    if ((lineBrandAllocations.length > 0 && accountingLines[j].linebrandallocation == allocationLines[i].brandallocation) || bodyBrandAllocation) {

                        const journalEntryLine = {
                            recordSubsidiary: recordSubsidiary,
                            subsidiary: allocationLines[i].subsidiary,
                            account: accountingLines[j].account,
                            entity: allocationLines[i].subsidiary == recordSubsidiary ? accountingLines[j].entity : null, // This is exclusive to Subsidiary errors thrown if incorrectly set
                            location: allocationLines[i].subsidiary == recordSubsidiary ? accountingLines[j].location : null, // This is exclusive to Subsidiary errors thrown if incorrectly set
                            memo: accountingLines[j].memo,
                            class: accountingLines[j].class,
                            department: allocationLines[i].subsidiary == recordSubsidiary ? accountingLines[j].department : null,
                            credit: Math.round((accountingLines[j].credit * allocationLines[i].percent) * 100) / 100, // Distribute the cost over each company
                            debit: Math.round((accountingLines[j].debit * allocationLines[i].percent) * 100) / 100// Distribute the cost over each company
                        };
                        log.debug('check', { subsidiary: journalEntryLine.subsidiary, recordSubsidiary: recordSubsidiary, check: (journalEntryLine.subsidiary == recordSubsidiary) })
                        if (journalEntryLine.subsidiary == recordSubsidiary) {
                            log.debug('swapped')
                            journalEntryLine.debit = Math.round((accountingLines[j].credit * allocationLines[i].percent) * 100) / 100; // Distribute the cost over each company
                            journalEntryLine.credit = Math.round((accountingLines[j].debit * allocationLines[i].percent) * 100) / 100;// Distribute the cost over each company
                        }

                        createJournalEntryLine(journalEntry, journalEntryLine);
                    }
                }
            }

            // These last lines are a payment between companies to balance the Journal
            for (let i = 0; i < allocationLines.length; i++) {
                const accountText = allocationLines[i].account_text;

                const journalEntryLine = {
                    recordSubsidiary: recordSubsidiary,
                    subsidiary: allocationLines[i].subsidiary,
                    account: allocationLines[i].account,
                    accountText: allocationLines[i].account_text,
                    entity: allocationLines[i].interco_entity,
                    credit: accountText.includes('AP') ? Math.round((total * allocationLines[i].percent) * 100) / 100 : null, // Determine who should pay & receive
                    debit: accountText.includes('AR') ? Math.round((total * allocationLines[i].percent) * 100) / 100 : null // Determine who should pay & receive
                };

                if (!splitDebit) {
                    journalEntryLine.credit = accountText.includes('AR') ? Math.round((total * allocationLines[i].percent) * 100) / 100 : null; // Determine who should pay & receive
                    journalEntryLine.debit = accountText.includes('AP') ? Math.round((total * allocationLines[i].percent) * 100) / 100 : null;
                }

                createJournalEntryLine(journalEntry, journalEntryLine);
            }

            balanceJournal(journalEntry);


            const journalEntryId = journalEntry.save({ ignoreMandatoryFields: true });

            log.audit('Journal Entry Successfully Created', {
                recordId: newRecord.id,
                recordType: newRecord.type,
                journalEntry: journalEntryId
            });

            createBrandAllocationLink(newRecord, journalEntryId);
        }

        /**
         * Search to get the percentage split needed to share the costs for the Advanced Intercompany Journal Entry.
         * 
         * @param {*} brandAllocation 
         * @param {*} lineBrandAllocations
         * @param {*} recordSubsidiary 
         * @returns {[Object]}
         */
        const getBrandAllocationLines = (brandAllocation, lineBrandAllocations, recordSubsidiary) => {
            const brandAllocations = brandAllocation ? brandAllocation : lineBrandAllocations.join(', ');
            const results = [];

            const queryResults = query.runSuiteQL(`
                SELECT  bal.custrecord_bal_account account,
                        bal.custrecord_bal_brand_allocation brandallocation,
                        BUILTIN.DF(bal.custrecord_bal_account) account_text,
                        bal.custrecord_bal_percentage percent,
                        bal.custrecord_bal_subsidiary subsidiary,
                        bal.custrecord_bal_interco_entity interco_entity

                FROM customrecord_brand_allocation_line bal

                WHERE bal.custrecord_bal_brand_allocation LIKE (${brandAllocations})
            `).asMappedResults();

            for (let i = 0; i < queryResults.length; i++) {
                if (i == 0) results.push({});
                if (queryResults[i].subsidiary == recordSubsidiary) {
                    results[0] = queryResults[i];
                } else {
                    results.push(queryResults[i]);
                }
            }

            return results;
        }

        /**
         * Gets the GL Impact lines so that they can be split over the different subsidiaries.
         * 
         * @param {int} recordId 
         * @returns {array}
         */
        const getTransactionAccountingLines = (recordId) => {
            const results = [];

            const queryResults = query.runSuiteQL(`
                SELECT tal.credit,
                       tal.debit,
                       tal.account,
                       tl.entity,
                       tl.memo,
                       tl.class,
                       tl.department,
                       tl.location,
                       tl.custcol_brand_allocation linebrandallocation,
                       t.custbody_brand_allocation as bodybrandallocation
   
                FROM transactionaccountingline tal
                LEFT JOIN transactionline tl ON tl.transaction = tal.transaction AND tl.id = tal.transactionline
                LEFT JOIN transaction t ON t.id = tal.transaction

                WHERE tal.transaction = ${recordId}
                AND   tal.amount != 0
            `).asMappedResults();

            for (let i in queryResults) {
                if (queryResults[i].bodybrandallocation || queryResults[i].linebrandallocation) {
                    results.push(queryResults[i]);
                }
            }

            return results;
        }

        /**
         * This function creates a Journal Entry Line used here so we are not duplicating code.
         * 
         * @param {record.Record} journalEntry 
         * @param {object} journalEntryLine 
         */
        const createJournalEntryLine = (journalEntry, journalEntryLine) => {

            //log.debug('Journal Entry', journalEntryLine);

            journalEntry.selectNewLine({ sublistId: 'line' });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', value: journalEntryLine.subsidiary });
            journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: journalEntryLine.account });

            if (journalEntryLine.entity) journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'entity',
                value: journalEntryLine.entity
            });

            if (journalEntryLine.location) journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'location',
                value: journalEntryLine.location
            });

            if (journalEntryLine.memo) journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'memo',
                value: journalEntryLine.memo
            });

            if (journalEntryLine.department) journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'department',
                value: journalEntryLine.department
            });

            if (journalEntryLine.class) journalEntry.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'class',
                value: journalEntryLine.class
            });

            if (journalEntryLine.credit) {
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: journalEntryLine.credit.toFixed(2) });
            } else {
                journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: journalEntryLine.debit.toFixed(2) });
            }

            journalEntry.commitLine({ sublistId: 'line' });
        }

        /**
         * This gets the total for the GL impact. Needed for the last line of the Advanced Intercompany Journal to cancel things out. 
         * 
         * @param {[object]} accountingLines 
         * @returns 
         */
        const getGLImpactTotal = (accountingLines) => {
            let debitTotal = 0;
            let creditTotal = 0;
            for (let i in accountingLines) {
                debitTotal += scsLibrary.parseFloat(accountingLines[i].debit);
                creditTotal += scsLibrary.parseFloat(accountingLines[i].credit);
            }

            const total = debitTotal ? debitTotal : creditTotal;

            return total;
        }

        /**
         * Each record that doesn't have an account field, I will use this map to get the account that should not be added to the Advanced Intercompnay Journal
         * 
         * @param {string} type 
         * @returns 
         */
        const recordMap = (type) => {
            const recordMap = {
                'purchaseorder': 115, //Purchase Order account
            }

            return recordMap[type] ? recordMap[type] : null;
        }

        /**
         * This function creates a link to created Advanced Intercompany Journal on the original record. Journal Entry is on a line level. Hence the Journal Entry is added to each line.
         * 
         * @param {record.Record} newRecord 
         * @param {int} journalEntryId 
         */
        const createBrandAllocationLink = (newRecord, journalEntryId) => {

            if (newRecord.type != 'journalentry') {
                record.submitFields({
                    type: newRecord.type,
                    id: newRecord.id,
                    values: {
                        custbody_brand_allocation_journal: journalEntryId
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });
            } else {
                const rec = record.load({
                    type: newRecord.type,
                    id: newRecord.id,
                    isDynamic: true
                });

                for (let i = 0; i < rec.getLineCount({ sublistId: 'line' }); i++) {
                    rec.selectLine({ sublistId: 'line', line: i })
                    const lineBrandAllocation = rec.getCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_brand_allocation' });

                    if (lineBrandAllocation) {
                        rec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_brand_allocation_journal', value: journalEntryId });

                        rec.commitLine({ sublistId: 'line' });
                    }
                }

                rec.save({ ignoreMandatoryFields: true });
            }

        }

        /**
         * This function balances the Journal if there is an error with rounding down to the cents.
         * 
         * @param {record.Record} journalEntry 
         */
        const balanceJournal = (journalEntry) => {
            const journalLines = [];
            const balanceBySubsidiary = {};

            for (let i = 0; i < journalEntry.getLineCount({ sublistId: 'line' }); i++) {
                journalLines.push({
                    subsidiary: journalEntry.getSublistValue({ sublistId: 'line', fieldId: 'linesubsidiary', line: i }),
                    account: journalEntry.getSublistValue({ sublistId: 'line', fieldId: 'account', line: i }),
                    credit: journalEntry.getSublistValue({ sublistId: 'line', fieldId: 'credit', line: i }),
                    debit: journalEntry.getSublistValue({ sublistId: 'line', fieldId: 'debit', line: i }),
                    line: i
                });
            }

            log.debug('journalEntryLines', journalLines);

            // Create object per Subsidiary to see if each subsidiary balances
            for (let i = 0; i < journalLines.length; i++) {
                if (!balanceBySubsidiary.hasOwnProperty(journalLines[i].subsidiary)) {
                    balanceBySubsidiary[journalLines[i].subsidiary] = {
                        credit: 0,
                        debit: 0
                    };
                }

                if (balanceBySubsidiary[journalLines[i].subsidiary]) {
                    balanceBySubsidiary[journalLines[i].subsidiary].credit += journalLines[i].credit ? journalLines[i].credit : 0
                    balanceBySubsidiary[journalLines[i].subsidiary].debit += journalLines[i].debit ? journalLines[i].debit : 0
                }
            }

            log.debug('balanceBySubsidiary', balanceBySubsidiary);

            for (let subsidiary in balanceBySubsidiary) {
                if (balanceBySubsidiary[subsidiary].debit == balanceBySubsidiary[subsidiary].credit) continue;

                let adjustCredit = false;
                let adjustBy = balanceBySubsidiary[subsidiary].credit - balanceBySubsidiary[subsidiary].debit;

                // It is assumed that the first line (original total of the GL Impact) is the correct amount
                // Lines that are added by the script to share the company expenses between two companies would be the ones in error.
                // This is done to determine wheather something should be added or subracted to balance the Journal correctly
                if (journalLines[0].debit) {
                    adjustCredit = true;
                    adjustBy = balanceBySubsidiary[subsidiary].debit - balanceBySubsidiary[subsidiary].credit;
                }

                for (let j in journalLines) {
                    // Find the first line of the subsidiary that should be adjusted and adjust it.
                    // The first line will be a line with the opposite debit/credit of the original total of the GL Impact
                    if (journalLines[j].subsidiary == subsidiary && !adjustCredit && journalLines[j].debit) {
                        const adjustedAmount = journalLines[j].debit + adjustBy;

                        journalEntry.selectLine({ sublistId: 'line', line: journalLines[j].line });
                        journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: adjustedAmount.toFixed(2) });
                        journalEntry.commitLine({ sublistId: 'line' });

                        break;
                    } else if (journalLines[j].subsidiary == subsidiary && adjustCredit && journalLines[j].credit) {
                        const adjustedAmount = journalLines[j].credit + adjustBy;

                        journalEntry.selectLine({ sublistId: 'line', line: journalLines[j].line });
                        journalEntry.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: adjustedAmount.toFixed(2) });
                        journalEntry.commitLine({ sublistId: 'line' });

                        break;
                    }

                }
            }
        }

        /**
         * This function determines if the GL Impact that needs to be split by the Advanced Intercompany Journal is a debit or credit.
         * By default a split debit is taking place
         * 
         * @param {[object]} accountingLines 
         * @param {string} type 
         * @returns 
         */
        const determineSplitType = (accountingLines, type) => {
            let splitDebit = true;

            if (type == 'vendorcredit') {
                splitDebit = false;
            } else if (type == 'journalentry' && accountingLines[0].credit) {
                splitDebit = false;
            }

            return splitDebit;
        }

        return {
            afterSubmit: afterSubmit
        };
    });
