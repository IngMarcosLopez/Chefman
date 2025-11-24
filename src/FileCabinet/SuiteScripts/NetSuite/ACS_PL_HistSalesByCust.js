/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define(['N/log', 'N/search'],
    function (log, search) {
        const renderPortlet = (params) => {
            let portlet = params.portlet;
            portlet.title = 'Historical Sales by Customer';
            portlet.addColumn({
                id: 'altname',
                type: 'text',
                label: 'Customer',
                align: 'left',
            });
            portlet.addColumn({
                id: 'amountsum',
                type: 'currency',
                label: 'Sum of Total Sales',
                align: 'left',
            });
            portlet.addColumn({
                id: 'amountpct',
                type: 'currency',
                label: 'Pct of Total of Sum of Amount',
                align: 'left',
            });
            let customerSearch = search.load({id: 'customsearch2576'});
            let topTen = customerSearch.run().getRange({start: 0, end: 10});
            topTen.forEach(result => {
                let row = {};
                row.altname = result.getValue(result.columns[0]);
                row.amountsum = result.getValue(result.columns[2]);
                row.amountpct = result.getValue(result.columns[3]);
                portlet.addRow(row);
            });
            let remainder = customerSearch.run().getRange({start: 10, end: 1000});
            let remainderSum = 0;
            let remainderPct = 0;
            remainder.forEach(result => {
                let sumTotalSales = Number(result.getValue(result.columns[2]));
                let sumTotalSalesPct = result.getValue(result.columns[3]);
                remainderSum += Number(sumTotalSales);
                remainderPct += parseFloat(sumTotalSalesPct);
            });
            let rowOther = {};
            rowOther.altname = '<a class="dottedlink viewitem" href="https://7336086-sb1.app.netsuite.com/app/common/search/searchresults.nl?searchid=2576&saverun=T&whence=">Other</a>';
            rowOther.amountsum = remainderSum;
            rowOther.amountpct = remainderPct.toFixed(2) + '%';
            portlet.addRow(rowOther);
        }
        return {render: renderPortlet}
    });