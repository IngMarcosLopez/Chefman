/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/ui/serverWidget'],

    /**
     *
     * @param {record} record
     * @param {search} search
     * @param {ui} ui
     * @returns {{beforeLoad: beforeLoad}}
     */
    (record, search, ui) => {

        const beforeLoad = context => {

            if (context.type == 'view' || context.type == 'edit') {

                try {

                    addSublist(context);

                } catch (e) {
                    log.error({
                        title: 'Error is',
                        details: e
                    });
                }
            }
        }

        const addSublist = context => {
            var itemId = context.newRecord.id;

            var tab = context.form.addTab({id: 'custpage_vendor_price', label: 'Vendor Price Changes'});

            var objSublist = context.form.addSublist({
                id: 'custpage_po_price_list',
                type: ui.SublistType.LIST,
                label: 'Price Changes',
                tab: 'custpage_vendor_price'
            });

            var purchaseorderSearchObj = search.create({
                type: "purchaseorder",
                filters: [
                    ["type", "anyof", "PurchOrd"],
                    "AND",
                    ["rate", "isnotempty", ""],
                    "AND",
                    ["item", "anyof", itemId]
                ],
                columns: [
                    search.createColumn({
                        name: "trandate",
                        sort: search.Sort.DESC,
                        label: "Date"
                    }),
                    search.createColumn({
                        name: "tranid",
                        label: "PO#"
                    }),
                    search.createColumn({
                        name: "fxrate",
                        label: "Price"
                    }),
                    search.createColumn({
                        name: "item",
                        label: "Item"
                    }),
                    search.createColumn({
                        name: "entityid",
                        join: "vendor",
                        label: "Vendor Name"
                    })
                ]
            });

            var c = 0;
            purchaseorderSearchObj.columns.forEach(function (col) {
                if ((col.label != 'nodisplay') && (col.label)) {
                    c++;
                    var colName = 'custpage_col' + c;
                    objSublist.addField({id: colName, label: col.label, type: ui.FieldType.TEXT});
                }
            });

            var searchResultCount = purchaseorderSearchObj.runPaged().count;
            log.debug("purchaseorderSearchObj result count", searchResultCount);
            var lineValue = 0;
            var priceList = [];
            purchaseorderSearchObj.run().each(function (result) {
                var c = 0;
                var rate = result.getValue({
                    name: "fxrate",
                    label: "Price"
                });
                if (priceList.indexOf(rate.toString()) == -1) {
                    for (var k in result.columns) {
                        if ((result.columns[k].label != 'nodisplay') && (result.columns[k].label)) {
                            c++;
                            var colName = 'custpage_col' + c;
                            var fieldValue = '';
                            if (result.getText(result.columns[k])) {
                                fieldValue = result.getText(result.columns[k]);
                            } else {
                                fieldValue = result.getValue(result.columns[k]);
                            }

                            if (!fieldValue) {
                                fieldValue = ' ';
                            }
                            objSublist.setSublistValue({id: colName, value: fieldValue, line: lineValue});
                            priceList.push(rate.toString());

                        }
                    }
                    lineValue += 1;
                }
                return true;
            });
        }

        return {
            beforeLoad: beforeLoad
        }
    }
)
