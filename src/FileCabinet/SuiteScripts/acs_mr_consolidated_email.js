/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', 'N/search', 'N/record', 'N/config','N/email','N/render'],

    (runtime, search, record, config, email, render) => {
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

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

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @since 2015.2
         */

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

                const key = `${customerId}::${customerEmail}`;

                context.write({
                    key: key,
                    value: invoiceData
                });
            } catch (error) {
                log.error('Error during map stage', error.message);
            }
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (context) => {
            try {
                const [customerId, customerEmail] = context.key.split('::');
                const invoices = context.values.map(JSON.parse);

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

                // BODY
                const scriptObj = runtime.getCurrentScript();
                const body = scriptObj.getParameter({ name: 'custscript_acs_email_body' });
                const emailAuthor =  scriptObj.getParameter({ name: 'custscript_acs_email_author' });

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
                            transactionId: Number(invoice)
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



        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
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
