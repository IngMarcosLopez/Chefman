/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/format', 'N/log'],
function(record, format, log) {

    // 月结条款的内部ID
    var MONTHLY_TERMS_ID = 1548;

    function beforeSubmit(context) {
        try {
            var rec = context.newRecord;
            var termsId = rec.getValue('terms');
            var tranDate = rec.getValue('trandate');
            
            log.debug({
                title: '输入值',
                details: '条款: ' + termsId + ', 交易日期: ' + tranDate
            });
            
            if (termsId == MONTHLY_TERMS_ID && tranDate) {
                var lastDayOfMonth = getLastDayOfMonth(tranDate);
                
                log.debug('计算出的月末日期', lastDayOfMonth);
                
                rec.setValue({
                    fieldId: 'duedate',
                    value: lastDayOfMonth,
                    ignoreFieldChange: true
                });
            }
        } catch (e) {
            log.error('脚本错误', e.toString());
        }
    }

    // 修复的日期计算函数
    function getLastDayOfMonth(dateStr) {
        // 直接使用NetSuite日期计算方式
        var year = dateStr.substring(0, 4);
        var month = dateStr.substring(5, 7);
        
        // 计算当月天数（考虑闰年）
        var daysInMonth = new Date(year, month, 0).getDate();
        
        // 确保格式为YYYY-MM-DD
        var dayStr = daysInMonth < 10 ? '0' + daysInMonth : daysInMonth;
        return year + '-' + month + '-' + dayStr;
    }

    return {
        beforeSubmit: beforeSubmit
    };
});