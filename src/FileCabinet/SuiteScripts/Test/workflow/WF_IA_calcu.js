/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 * @Description 在提交记录前计算表头总和（custbody_ia_adjust_total = Σ|custcol_swc_adjust_quantity × unitcost|）
 */
define(['N/record', 'N/log', 'N/runtime'], function(record, log, runtime) {
    /**
     * 主逻辑：计算表头总和
     * @param {Object} scriptContext - 工作流上下文
     */
    function onAction(scriptContext) {
        var rec = scriptContext.newRecord;
        var sublistId = 'inventory';
        var total = 0;
        var hasError = false;

        try {
            // 遍历表体行，计算每行乘积绝对值并累加
            var lineCount = rec.getLineCount({ sublistId: sublistId });
            for (var i = 0; i < lineCount; i++) {
                var qty = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custcol_swc_adjust_quantity',
                    line: i
                }) || 0;
                var cost = rec.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'unitcost',
                    line: i
                }) || 0;
               //total += Math.abs(qty * cost); // 强制取绝对值
                total += qty * cost; // 强制取绝对值
            }

            // 更新表头字段
            rec.setValue({
                fieldId: 'custbody_ia_adjust_total',
                value: total
            });
            log.audit('计算成功', '表头总和: ' + total);

        } catch (e) {
            hasError = true;
            log.error('计算失败', '错误: ' + e.message);
            // 抛出异常阻止提交（需在工作流中配置“失败时停止”）
            throw e; 
        }
    }

    return {
        onAction: onAction
    };
});