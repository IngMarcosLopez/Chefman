/**
 * @author Kyle Lopes <kyle.lopes@scscloud.com>
 * @version 2022-12-12
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 **/

define(['N/search', 'N/record', 'N/query', '../Library/scs-library-2'],

    /**
     *
     * @param {search} search
     * @param {record} record
     * @returns {{beforeSubmit: beforeSubmit}}
     */
    (search, record, query, scsLibrary) => {

        const beforeSubmit = context => {
            try {

                if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
                    setSubsidiaryAndIncludeChildren(context.newRecord);
                }

            } catch (error) {
                log.error('beforeSubmit', error.toJSON ? error : error.toString());
            }
        }

        const afterSubmit = context => {
            try {

            } catch (error) {
                log.error('afterSubmit', error.toJSON ? error : error.toString());
            }
        }

        /**
         * 
         * @param {*} newRecord 
         * @returns {null}
         */
        const setSubsidiaryAndIncludeChildren = (newRecord) => {
            const MEXICOSUBSIDIARY = 10;
            const PARENTSUBSIDIARY = 1;

            const subsidiary = newRecord.getValue({ fieldId: 'subsidiary' });

            if (subsidiary != MEXICOSUBSIDIARY) {
                newRecord.setValue({ fieldId: 'subsidiary', value: PARENTSUBSIDIARY });
                newRecord.setValue({ fieldId: 'includechildren', value: true });
            }

        }


        return {
            beforeSubmit: beforeSubmit
        };
    });
