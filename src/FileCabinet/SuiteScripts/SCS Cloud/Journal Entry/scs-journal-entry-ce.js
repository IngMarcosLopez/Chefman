/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType ClientScript
 * @see https://system.netsuite.com/app/help/helpcenter.nl?fid=section_4387798404.html
 */
define([],

    /**
     * @return {{
     *   pageInit?: Function,
     *   validateField?: Function,
     *   fieldChanged?: Function,
     *   postSourcing?: Function,
     *   lineInit?: Function,
     *   validateLine?: Function,
     *   validateInsert?: Function,
     *   validateDelete?: Function,
     *   sublistChanged?: Function,
     *   saveRecord?: Function,
     * }}
     */
    () => {

        /**
         * Used in logs to help identify which client script is doing the logging
         * @type {string}
         */
        const SCRIPT_FILENAME = 'scs-journal-entry-ce.js';

        /**
         * @param {LineInitContext} context
         * @return {void}
         */
        const lineInit = context => {

            try {

                setLineDefaults(context);

                console.log(`${SCRIPT_FILENAME}: lineInit:`, context);
            } catch (e) {
                console.error(`${SCRIPT_FILENAME}: lineInit:`, e);
            }
        };

        /**
         * Copies the first line's department, class, and memo to the current line.
         *
         * @param context
         */
        const setLineDefaults = context => {

            const rec = context.currentRecord;

            if (context.line === 0) return;

            const firstDepartment = rec.getSublistValue({
                sublistId: 'line',
                fieldId: 'department',
                line: 0
            });
            const firstClass = rec.getSublistValue({
                sublistId: 'line',
                fieldId: 'class',
                line: 0
            });
            const firstMemo = rec.getSublistValue({
                sublistId: 'line',
                fieldId: 'memo',
                line: 0
            });
            const firstLocation = rec.getSublistValue({
                sublistId: 'line',
                fieldId: 'location',
                line: 0
            });
            const currentDepartment = rec.getCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'department'
            });
            const currentClass = rec.getCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'class'
            });
            const currentMemo = rec.getCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'memo'
            });
            const currentLocation = rec.getCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'location'
            });

            if (firstDepartment && !currentDepartment) rec.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'department',
                value: firstDepartment
            });
            if (firstClass && !currentClass) rec.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'class',
                value: firstClass
            });
            if (firstMemo && !currentMemo) rec.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'memo',
                value: firstMemo
            });
            if (firstLocation && !currentLocation) rec.setCurrentSublistValue({
                sublistId: 'line',
                fieldId: 'location',
                value: firstLocation
            });
        }

        return {
            lineInit,
        };
    }
);
