/**
 * @NApiversion 2.0
 * @NScriptType ScheduledScript             //脚本声明
 */

define(["N/record"],                        //引用模块，模块用法通过Netsuite帮助中心，搜索SuiteScript Modules进行学习
    function (record) {

        function execute(context) {
            var rec = record.create({
                type: 'salesorder',
                isDynamic: true
            });

            rec.setValue({
                fieldId: 'entity',
                value: 5098
            });

            rec.setValue({
                fieldId: 'location',
                value: 40
            });

            rec.setValue({
                fieldId: 'memo',
                value: "脚本定时执行销售订单创建"
            });

            rec.selectNewLine({
                sublistId: 'item'
            });

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: 14345                      //C45CQ602BP1AQ
            });

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: 12
            });

            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: 40
            });

            rec.commitLine({
                sublistId: 'item',
            });

            var internalID = rec.save();

            log.debug({
                title: "Sales Order Successfully Saved",
                details: "Sales Order Id Is : " + internalID
            });
        }

        return {
            execute: execute
        }
    })