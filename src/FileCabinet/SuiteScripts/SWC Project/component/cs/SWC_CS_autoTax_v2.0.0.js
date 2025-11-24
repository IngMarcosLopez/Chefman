/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {
        //自定义字段含税单价id
        const CUSTCOL_ID = 'custcol_chefman_rateincludetax';
        //保留小数位数
        const DECIMAL_PLACES = 8;
        //全区标识变量
        var rateChangeFlag = true;
        // 切换税率的场合，应用单价计算方式（true: 由单价计计算含税单价，false: 由含税单价计算单价）
        var unitPriceCalcFlag = false;

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {

            var currentRecord = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;
            //货品行
            if ("item" == sublistId) {
                var fieldId = scriptContext.fieldId;
                //单价改变
                if ("rate" == fieldId) {
                    if (rateChangeFlag) {
                        //单价
                        var price = currentRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                        }) || 0;
                        //获取税率
                        var taxRate = currentRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxrate1'
                        });
                        //非空判断
                        if (taxRate === 0 || (taxRate != null && taxRate != '')) {
                            //返回税率小数
                            var taxValue = toPoint(taxRate);
                            //获取含税单价
                            var result = accMul(price, Number(1 + taxValue));
                            //设置含税单价
                            currentRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: CUSTCOL_ID,
                                value: result.toFixed(DECIMAL_PLACES),
                                ignoreFieldChange: true
                            });
                        }
                    }
                    rateChangeFlag = true;
                } else if ("taxrate1" == fieldId) {//税率改变
                    //获取税率
                    var taxRate = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxrate1'
                    });
                    //非空判断
                    if (taxRate === 0 || (taxRate != null && taxRate != '')) {
                        //返回税率小数
                        var taxValue = toPoint(taxRate);

                        if (unitPriceCalcFlag) {
                            // 基于单价计算含税单价
                            //单价
                            var price = currentRecord.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                            }) || 0;
                            // 获取含税单价
                            var result = accMul(price, Number(1 + taxValue));
                            // 设置含税单价
                            currentRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: CUSTCOL_ID,
                                value: result.toFixed(DECIMAL_PLACES),
                                ignoreFieldChange: true
                            });
                        } else {
                            // 基于含税单价计算单价
                            // 改变标识变量
                            rateChangeFlag = false;
                            // 含税单价
                            var taxPrice = currentRecord.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: CUSTCOL_ID,
                            }) || 0;
                            var result = accDiv(taxPrice, Number(1 + taxValue));
                            // 设置单价
                            currentRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: result.toFixed(DECIMAL_PLACES),
                                ignoreFieldChange: false
                            });
                        }
                    }
                } else if (CUSTCOL_ID == fieldId) {//自定义字段含税单价
                    //含税单价
                    var taxPrice = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: CUSTCOL_ID,
                    }) || 0;
                    //获取税率
                    var taxRate = currentRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxrate1'
                    });
                    //非空判断
                    if (taxRate === 0 || (taxRate != null && taxRate != '')) {
                        //改变标识变量
                        rateChangeFlag = false;
                        //返回税率小数
                        var taxValue = toPoint(taxRate);
                        //获取单价
                        var result = accDiv(taxPrice, (1 + taxValue));
                        //设置单价
                        currentRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: result.toFixed(DECIMAL_PLACES),
                            ignoreFieldChange: false
                        });
                    }
                }
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        /**
         *
         * 将取得的税率转换成小数,去除%,转换小数
         */
        function toPoint(percent) {
            percent = percent + ""
            var str = percent.replace("%", "");
            str = accDiv(parseFloat(str), 100);
            return str;
        }

        /**
         *除法函数
         */
        function accDiv(arg1, arg2) {
            var t1 = 0, t2 = 0, r1, r2;
            try {
                t1 = arg1.toString().split(".")[1].length;
            } catch (e) {
            }
            try {
                t2 = arg2.toString().split(".")[1].length;
            } catch (e) {
            }
            with (Math) {
                r1 = Number(arg1.toString().replace(".", ""));
                r2 = Number(arg2.toString().replace(".", ""));
                return (r1 / r2) * pow(10, t2 - t1);
            }
        }

        /**
         *
         * 乘法函数
         */
        function accMul(arg1, arg2) {

            var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
            try {
                m += s1.split(".")[1].length;
            } catch (e) {
            }
            try {
                m += s2.split(".")[1].length;
            } catch (e) {
            }
            return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m);
        }

        return {
            //pageInit: pageInit,
            fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            //sublistChanged: sublistChanged,
            lineInit: lineInit,
            //validateField: validateField,
            //validateLine: validateLine,
            //validateInsert: validateInsert,
            //validateDelete: validateDelete,
            //saveRecord: saveRecord
        };

    });
