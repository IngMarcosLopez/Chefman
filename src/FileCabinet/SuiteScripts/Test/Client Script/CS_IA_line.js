/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @Description 库存调整单实时计算调整价值（|数量×成本|），强制监听所有数据变更。
 */
define(['N/currentRecord', 'N/log', 'N/runtime'], 
    function(currentRecord, log, runtime) {
        // 防抖延迟（毫秒）
        var DEBOUNCE_DELAY = 300;
        var debounceTimer = null;
    
        /**
         * 计算当前行的调整价值（绝对值）
         * @param {record} record - 当前记录
         * @param {number} lineNum - 行号
         */
        function calculateAdjustValue(record, lineNum) {
            try {
                record.selectLine({ sublistId: 'inventory', line: lineNum });
                var qty = record.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_swc_adjust_quantity'
                }) || 0;
                var cost = record.getCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'unitcost'
                }) || 0;
                
                record.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_ia_adjust_value',
                    //value: Math.abs(qty * cost),
                    value: qty * cost,
                    ignoreFieldChange: true
                });
            } catch (e) {
                log.error('calculateAdjustValue', '行' + (lineNum + 1) + '失败: ' + e.message);
            }
        }
    
        /**
         * 防抖执行全表计算
         */
        function debounceCalculateAll(record) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                var lineCount = record.getLineCount({ sublistId: 'inventory' });
                for (var i = 0; i < lineCount; i++) {
                    calculateAdjustValue(record, i);
                }
            }, DEBOUNCE_DELAY);
        }
    
        /**
         * 页面初始化时绑定全局监听
         */
        function pageInit(context) {
            var record = context.currentRecord;
            
            // 初始计算所有行
            debounceCalculateAll(record);
            
            // 监听所有字段变更（包括通过API/脚本修改）
            runtime.onFieldChange = function() {
                debounceCalculateAll(record);
            };
        }
    
        /**
         * 字段变更事件（实时响应手动编辑）
         */
        function fieldChanged(context) {
            if (context.sublistId === 'inventory' && 
                (context.fieldId === 'custcol_swc_adjust_quantity' || context.fieldId === 'unitcost')) {
                calculateAdjustValue(context.currentRecord, context.line);
            }
        }
    
        /**
         * 来源填充事件
         */
        function postSourcing(context) {
            if (context.sublistId === 'inventory' && 
                (context.fieldId === 'custcol_swc_adjust_quantity' || context.fieldId === 'unitcost')) {
                calculateAdjustValue(context.currentRecord, context.line);
            }
        }
    
        /**
         * 保存时强制校验
         */
        function saveRecord(context) {
            debounceCalculateAll(context.currentRecord);
            return true;
        }
    
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            saveRecord: saveRecord
        };
    });