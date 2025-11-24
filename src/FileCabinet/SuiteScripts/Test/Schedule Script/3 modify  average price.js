//文心一言
/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'/*,  'N/runtime' */ ],
    function (search, record  /*,  runtime */) {

        function execute(context) {
            var subsidiary = '25'; // 替换为某公司的内部ID

            // 构建搜索查询
            var searchObj = search.create({
                type: 'assemblyitem',
                filters: [
                    ['subsidiary', 'anyof', subsidiary]
                ],
                columns: [
                    search.createColumn({ name: 'internalid', summary: 'group' }),
                    search.createColumn({ name: 'avgprice', summary: 'avg' })
                ]
            });

            // 执行搜索
            //var searchResult = searchObj.run();   文心一言
            var mySearch = search.load({
                id: 'customsearch_item_average_sales_price'   //search ID
            });

            // 遍历搜索结果并更新货品记录
            searchResult.each(function (result) {
                var itemid = result.getValue({ item: 'internalid' });
                var avgPrice = result.getValue({ fxrate: 'avgprice' });

                // 确保平均价格不是null或undefined
                if (avgPrice) {
                    try {
                        // 更新货品记录
                        var itemRecord = record.load({
                            type: 'assemblyitem',
                            id: itemid,
                            isDynamic: true
                        });

                        // 更新平均价格字段（假设该字段存在，并且你有权限更新它）
                        itemRecord.setValue({
                            fieldId: 'custitem_average_sales_price', // 替换为实际的自定义字段ID
                            value: avgPrice
                        });

                        // 提交记录
                        itemRecord.save();

                        log.debug({
                            title: 'Updated Average Price',
                            details: 'Item ID: ' + itemid + ', New Average Price: ' + avgPrice
                        });
                    } catch (e) {
                        log.error({
                            title: 'Error Updating Item',
                            details: 'Item ID: ' + itemid + ', Error: ' + e.message
                        });
                    }
                }
            });
        }

        return {
            execute: execute,
            /*    
            schedule: function() {
                    // 设置执行频率，例如每天凌晨1点执行
                    return runtime.currentScript.schedule({
                        weekDay: 'SUNDAY', // 或者 'MONDAY' 到 'SATURDAY'
                        hour: 1,
                        minute: 0,
                        recurrence: 1 // 每周执行一次
                    });
                }
            */
        };
    });