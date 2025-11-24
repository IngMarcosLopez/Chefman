/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/record', 'N/config','N/email','N/render'],

    (runtime, search, record, config, email, render) => {
        const getInputData = (context) => {
            try {
                const scriptObj = runtime.getCurrentScript();
                const searchId = scriptObj.getParameter({ name: 'custscript_acs_savedsearch' });

                if (!searchId) {
                    throw new Error('Search ID script parameter is missing.');
                }

                // Load and return the saved search
                return search.load({ id: searchId });

            } catch (error) {
                log.error('getInputData Error', error.message);
                throw error;
            }

        }

        const map = (context) => {
            try {
                const result = JSON.parse(context.value);
                const customerId = result.values.entity.value;
                const customerEmail = result.values["email.customerMain"];
                //const isApproved = result.values.custbody8 === 'T';
                //if (!customerEmail) return;

                const invoiceData = {
                    internalId: result.id,
                    tranName: result.transactionname,
                    tranId: result.values.tranid,
                    tranDate: result.values.trandate,
                    amount: result.values.total,
                    salesRep: result.values.salesrep
                };
                log.debug('invoiceData', invoiceData);
                const key = `${customerId}::${customerEmail}`;

                context.write({
                    key: key,
                    value: invoiceData
                });
            } catch (error) {
                log.error('Error during map stage', error.message);
            }
        }

        const reduce = (context) => {
            try {
                const [customerId, customerEmail] = context.key.split('::');
                const invoices = context.values.map(JSON.parse);
                log.debug('invoices', invoices);

                if (!customerEmail) {
                    log.error('Missing Email', `Customer ID ${customerId} has no email.`);
                    return;
                }

                const companyName = config.load({
                    type: config.Type.COMPANY_INFORMATION
                }).getValue({ fieldId: 'companyname' });

                // SUBJECT
                const subject = `${companyName}: Invoice #${invoices[0].tranId}`;

                // INVOICE Attachment
                const attachments = invoices.map(inv => {
                    try {
                        return render.transaction({
                            entityId: Number(inv.internalId),
                            printMode: render.PrintMode.PDF
                        });
                    } catch (e) {
                        log.error('PDF Render Failed', `Invoice ID: ${inv.internalId} - ${e.message}`);
                        return null;
                    }
                }).filter(file => file !== null);
                log.debug('attachments', attachments);

                // BODY
                const scriptObj = runtime.getCurrentScript();
                const body = scriptObj.getParameter({ name: 'custscript_acs_email_body' });
                const emailAuthor =  scriptObj.getParameter({ name: 'custscript_acs_email_author' });
                const invIdsArr = invoices.map(inv => Number(inv.internalId));
                log.debug('invIdsArr', invIdsArr.length);
                const invIdsObj = invIdsArr.map(invId => {
                    return { 'transactionId': invId }
                });
                log.debug('invIdsObj', invIdsObj);
                if (!attachments.length) {
                    log.error('No Attachments', `No PDFs were rendered for customer ${customerId}`);
                    return;
                }
               

                try {
                    email.send({
                        author: Number(emailAuthor),
                        recipients: customerEmail,
                        subject: subject,
                        body: body,
                        attachments: attachments,
                        relatedRecords: {
                            transactionId: invIdsArr
                        }
                    });
                } catch (emailErr) {
                    log.error('Email Send Failed', emailErr.message);
                    return;
                }

                invoices.map(inv => {
                    try {
                        record.submitFields({
                            type: record.Type.INVOICE,
                            id: inv.internalId,
                            values: { custbody_invoice_actioned: true },
                            options: { enableSourcing: false, ignoreMandatoryFields: true }
                        });
                    } catch (e) {
                        log.error('Checkbox setting failed', `Invoice ID: ${inv.internalId} - ${e.message}`);
                        return null;
                    }
                });
                

                log.audit('Email Sent', `To: ${customerEmail} | Invoices: ${invoices.length}`);

            } catch (error) {
                log.error('Error during reduce stage', error.message);
            }
        };

        const summarize = (summaryContext) => {
            try {
                // Basic script summary info
                log.audit('Map/Reduce Summary', {
                    usage: summaryContext.usage,
                    yields: summaryContext.yields,
                    seconds: summaryContext.seconds,
                    dateCreated: summaryContext.dateCreated
                });
        
                // Log any errors from the input stage
                if (summaryContext.inputSummary.error) {
                    log.error('Input Error', summaryContext.inputSummary.error);
                }
        
                // Log any errors from the map stage
                summaryContext.mapSummary.errors.iterator().each((key, error) => {
                    log.error(`Map Error | Key: ${key}`, error);
                    return true;
                });
        
                // Log any errors from the reduce stage
                summaryContext.reduceSummary.errors.iterator().each((key, error) => {
                    log.error(`Reduce Error | Key: ${key}`, error);
                    return true;
                });
        
                // Optional: Log successful output (from reduce stage)
                summaryContext.output.iterator().each((key, value) => {
                    log.audit(`Reduce Output | Customer: ${key}`, value);
                    return true;
                });
        
            } catch (e) {
                log.error('Summarize Failed', e.message);
            }
        };
        

        return { getInputData, map, reduce, summarize }

    });
