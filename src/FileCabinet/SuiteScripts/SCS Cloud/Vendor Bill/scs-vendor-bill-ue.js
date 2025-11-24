/**
 * @author Kyle Lopes <kyle.lopes@scscloud.com>
 * @version 2022-12-05
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/record', 'N/redirect', 'N/url', 'N/query', '../Library/scs-library-2'],

    /**
     *
     * @param {record} record
     * @returns {{afterSubmit: afterSubmit}}
     */
    (record, redirect, url, query, scsLibrary) => {

        const beforeLoad = context => {
            try {
                const approve = context.request && context.request.parameters && context.request.parameters.custparam_approved ? true : false;
                log.debug(context.type)
                if (context.type == context.UserEventType.VIEW) {
                    setApproved(approve, context.newRecord);
                    addApproveButton(context.form, context.newRecord);
                }

            } catch (error) {
                log.error('beforeLoad', error.toJSON ? error : error.toString());
            }
        }

        const afterSubmit = context => {
            try {

            } catch (error) {
                log.error('afterSubmit', error.toJSON ? error : error.toString());
            }
        }

        /**
         * Add approved button if not approved
         * 
         * @param {*} form 
         * @param {*} newRecord 
         */
        const addApproveButton = (form, newRecord) => {
            const isApproved = newRecord.getValue({ fieldId: 'custbody_approved' });
            if (!isApproved) {
                const recordUrl = url.resolveRecord({
                    recordId: newRecord.id,
                    recordType: newRecord.type,
                    params: {
                        custparam_approved: 'T'
                    }
                });

                form.addButton({
                    id: 'custpage_approve_button',
                    label: 'Approve Bill',
                    functionName: `function approve() {
                        window.location="${recordUrl}";
                    } approve();`
                })
            }
        }

        const setApproved = (approve, newRecord) => {
            if (approve) {
                record.submitFields({
                    type: newRecord.type,
                    id: newRecord.id,
                    values: {
                        custbody_approved: approve
                    },
                    options: {
                        ignoreMandatoryFields: true
                    }
                });

                redirect.toRecord({
                    id: newRecord.id,
                    type: newRecord.type
                });
            }
        }


        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });
