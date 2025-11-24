/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/format'], 
    function(currentRecord, format) {
        function saveRecord(context) {
            var record = context.currentRecord;
            // 获取条款字段值
            var termsId = record.getValue({ fieldId: 'terms' });
            // 仅当月结条款（ID=1548）时处理
            if (termsId == 1548) {
                var tranDate = record.getValue({ fieldId: 'trandate' });
                if (tranDate) {
                    // 计算月末日期
                    var lastDayOfMonth = getLastDayOfMonth(tranDate);
                    // 更新到期日字段
                    record.setValue({
                        fieldId: 'duedate',
                        value: lastDayOfMonth
                    });
                }
            }
            return true; // 必须返回true以继续保存
        }
    
        // 计算当月最后一天的函数
        function getLastDayOfMonth(dateString) {
            var date = new Date(dateString);
            // 获取下个月的第0天（即当前月最后一天）
            var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            // 格式化为YYYY-MM-DD
            return format.format({
                value: lastDay,
                type: format.Type.DATE
            });
        }
    
        return {
            saveRecord: saveRecord
        };
    });