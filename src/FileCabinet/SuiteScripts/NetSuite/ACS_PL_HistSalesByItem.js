/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define(['N/log', 'N/search'],
    function (log, search) {
        const renderPortlet = (params) => {
            let portlet = params.portlet;
            portlet.title = 'Historical Sales by Item';
            portlet.addColumn({
                id: 'item',
                type: 'text',
                label: 'Item',
                align: 'left',
            });
            portlet.addColumn({
                id: 'salesdescription',
                type: 'text',
                label: 'Description',
                align: 'left',
            });
            portlet.addColumn({
                id: 'amountsum',
                type: 'currency',
                label: 'Sum of Total Sales',
                align: 'left',
            });
            portlet.addColumn({
                id: 'qtysum',
                type: 'integer',
                label: 'Sum of Quantity',
                align: 'left',
            });
            portlet.addColumn({
                id: 'amountpct',
                type: 'currency',
                label: 'Pct of Total Average',
                align: 'left',
            });
            let customerSearch = search.load({id: 'customsearch2575'});
            let topTen = customerSearch.run().getRange({start: 0, end: 10});
            topTen.forEach(result => {
                let row = {};
                row.item = result.getValue(result.columns[0]);
                row.salesdescription = result.getValue(result.columns[1]);
                row.amountsum = result.getValue(result.columns[4]);
                row.qtysum = result.getValue(result.columns[5]);
                row.amountpct = result.getValue(result.columns[6]);
                portlet.addRow(row);
            });
            let remainder = customerSearch.run().getRange({start: 10, end: 1000});
            let remainderSum = 0;
            let remainderQty = 0;
            let remainderPct = 0;
            remainder.forEach(result => {
                let sumTotalSales = Number(result.getValue(result.columns[4]));
                let sumTotalQty = Number(result.getValue(result.columns[5]));
                let sumTotalSalesPct = result.getValue(result.columns[6]);
                remainderSum += Number(sumTotalSales);
                remainderQty += Number(sumTotalQty);
                remainderPct += parseFloat(sumTotalSalesPct);
            });
            let rowOther = {};
            rowOther.item = '<a class="dottedlink viewitem" href="https://7336086.app.netsuite.com/app/common/search/searchresults.nl?searchid=2575&saverun=T&whence=">Other</a>';
            rowOther.salesdescription = '<a class="dottedlink viewitem" href="https://7336086.app.netsuite.com/app/common/search/searchresults.nl?searchid=2575&saverun=T&whence=">Other</a>';
            rowOther.amountsum = remainderSum;
            rowOther.qtysum = remainderQty;
            rowOther.amountpct = remainderPct.toFixed(2) + '%';
            portlet.addRow(rowOther);
        }
        return {render: renderPortlet}
    });