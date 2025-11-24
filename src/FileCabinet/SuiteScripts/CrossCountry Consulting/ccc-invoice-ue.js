/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType UserEventScript
 * @see [Help Center (Private)]{@link https://system.netsuite.com/app/help/helpcenter.nl?fid=section_4387799721}
 * @see [Help Center (Public)]{@link https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4387799721.html}
 * @see [File Templates]{@link https://github.com/burkybang/SuiteScript-WebStorm-File-Templates}
 * @see [Type Declarations]{@link https://github.com/burkybang/SuiteScript-2.0-Type-Declarations}
 * @author
 */
define(['N/record'],

    /**
     * @param {record} record
     * @return {{
     *   beforeLoad?: Function,
     *   beforeSubmit?: Function,
     *   afterSubmit?: Function,
     * }}
     */
    (record) => {
        /**
         * @type {string} HRCReferenceFieldId
         */
        const HRCReferenceFieldId = 'custbody_hrc_reason_code_desc';

        const c2foItemId = '60926'  // SBX: 60926
        const returnItemId2 = '60545' // SBX: 60545


        /**
         * @param {BeforeLoadContext} context
         * @return {void}
         */
        const beforeLoad = context => {
            try {
                log.audit('beforeLoad', {
                    type: context.type,
                    form: context.form,
                    newRecord: {
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                    },
                    request: !context.request ? null : {
                        url: context.request.url,
                        parameters: context.request.parameters,
                    },
                });
                const {type, newRecord, form, request} = context;
            } catch (e) {
                log.error('beforeLoad', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
            }
        };

        /**
         * @param {BeforeSubmitContext} context
         * @return {void}
         */
        const beforeSubmit = context => {
            try {
                log.audit('beforeSubmit', {
                    type: context.type,
                    newRecord: {
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                    },
                    oldRecord: !context.oldRecord ? null : {
                        type: context.oldRecord.type,
                        id: context.oldRecord.id,
                    },
                });
                const {type, newRecord, oldRecord} = context;

            } catch (e) {
                log.error('beforeSubmit', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
            }
        };

        /**
         * @param {AfterSubmitContext} context
         * @return {void}
         */
        const afterSubmit = context => {
            try {
                log.audit('afterSubmit', {
                    type: context.type,
                    newRecord: {
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                    },
                    oldRecord: !context.oldRecord ? null : {
                        type: context.oldRecord.type,
                        id: context.oldRecord.id,
                    },
                });
                const {type, newRecord, oldRecord} = context;
                handleAutoCreateApplyCreditMemo(context)

            } catch (e) {
                log.error('afterSubmit', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
            }
        };


        const handleAutoCreateApplyCreditMemo = (context) => {
            const {type, newRecord, oldRecord} = context;
            if (![context.UserEventType.CREATE].includes(type)) return;

            /**
             * @type {string} hrcReference
             */
            const hrcReference = (newRecord.getValue({fieldId: HRCReferenceFieldId})??'')+'';
            log.debug("hrcReference", hrcReference);

            if (!hrcReference) return;


            /**
             * @type {string} numItems
             */
            const numItems = (newRecord.getLineCount({sublistId: 'item'})??'')+'';

            /**
             * @type {[]}
             */
            const arrReturns = [];

            for (let i=0; i<numItems; i++){
                /**
                 * @type {string} item
                 */
                const item = (newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i})??'')+'';
                if (item === c2foItemId || item === returnItemId2){
                    /**
                     * @type {number} amount
                     */
                    const rate = +newRecord.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i}) ?? 0;
                    /**
                     * @type {number} amount
                     */
                    const amount = +newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i}) ?? 0;

                    const taxCode = (newRecord.getSublistValue({sublistId: 'item', fieldId: 'taxcode', line: i}) ?? '')+'';
                    const location = (newRecord.getSublistValue({sublistId: 'item', fieldId: 'location', line: i}) ?? '')+'';


                    arrReturns.push({
                        'item': item,
                        'rate': rate,
                        'amount': amount,
                        'taxcode': taxCode,
                        'location': location
                    });
                }
            }
            log.debug("arrReturns", arrReturns);

            if (arrReturns.length === 0) return;

            createCreditMemo(context, arrReturns);

        }

        const createCreditMemo = (context, arrReturns) => {
            const {type, newRecord, oldRecord} = context;

            const invoiceId = newRecord.id; // apply cm to this invoice

            // Create credit memo
            const creditMemoRecord = record.transform({
                fromType: record.Type.INVOICE,
                fromId: invoiceId,
                toType: record.Type.CREDIT_MEMO,
                isDynamic: true,
            });

            // Clear credit memo lines
            clearRecordLines(creditMemoRecord);

            // Add return lines to credit memo
            addReturnLines(creditMemoRecord, arrReturns);

            // Apply credit memo to invoice
            applyCreditMemoLines(creditMemoRecord, invoiceId);

            const cmID = creditMemoRecord.save();
            log.debug("cmID", cmID);


        }

        const clearRecordLines = (rec) =>{
            // log.debug("clearRecordLines");

            const numItems = +rec.getLineCount({sublistId: 'item'}) ?? 0;
            // log.debug("numTiems", numItems);
            for (let i=numItems - 1; i>=0; i--){
                rec.removeLine({
                    sublistId: 'item',
                    line: i,
                    ignoreRecalc: true
                });
            }
            // log.debug("rec", rec);
            // const s2 = rec.getLineCount({sublistId: 'item'});
            // log.debug("s2",  s2);

        }


        const addReturnLines = (rec, arr) =>{
            // log.debug("addReturnLines");
            const t1 = rec.getLineCount({sublistId:'item'})

            let line = 0
            arr.forEach(val => {
                const item = val.item;
                const rate = val.rate;
                const amount = val.amount;
                log.debug("val", val);
                log.debug("item", item);
                log.debug("rate", rate);
                log.debug("amount", amount);


                rec.selectNewLine({
                    sublistId: 'item'
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: item
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: rate
                });
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: amount
                });
                rec.commitLine({sublistId: 'item'})
                line++;
            });
            // log.debug("lines processed", line);

            // const t2 = rec.getLineCount({sublistId:'item'});
            // log.debug("rec line count 2", t2);
        };

        const applyCreditMemoLines = (rec, invoice) => {
            const lineToApply = rec.findSublistLineWithValue({
                sublistId: 'apply',
                fieldId: 'internalid',
                value: invoice
            });
            // log.debug('lineToApply', lineToApply)

            rec.selectLine({
                sublistId: 'apply',
                line: lineToApply
            });
            rec.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                value: true
            });
            rec.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'due',
                value: rec.getValue({fieldId: 'total'})
            });
            // rec.setCurrentSublistValue({
            //     sublistId: 'apply',
            //     fieldId: 'internalid',
            //     value: invoice
            // });
            rec.commitLine({sublistId: 'apply'})

        }



        return {
            // beforeLoad,
            // beforeSubmit,
            afterSubmit,
        };
    },
);