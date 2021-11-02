odoo.define('flexiretail_invoicing_pe.invoice_cpe', function (require) {
    "use strict";

    var models = require('point_of_sale.models');
    var screens = require('point_of_sale.screens');
    var PosDB = require('point_of_sale.DB');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;

    var PosModelSuper = models.PosModel;
    var PosDBSuper = PosDB;
    var OrderSuper = models.Order;

    models.load_fields("res.partner", ["doc_number"]);

    PosDB = PosDB.extend({
        init: function (options) {
            this.details_amount = {};
            return PosDBSuper.prototype.init.apply(this, arguments);
        },
        set_details_amount: function (detalle) {
            if (detalle) {
                this.details_amount = detalle;
            }
        },
        get_details_amount: function () {
            return this.details_amount;
        },
    });

    models.PosModel = models.PosModel.extend({
        get_pos_details_amount: function (number_invoice, name_order) {
            self = this;
            var detalle = {}
            rpc.query({
                model: 'pos.order',
                method: 'pos_get_details_amount',
                args: [name_order, number_invoice],
            }, {
                async: false,
                timeout: 7200,
            })
                .then(function (result) {
                    detalle = result
                }).fail(function (type, error) {
                self.config.is_sync = true;
                console.log('Failed to get_details_amount_pos');
            });
            return detalle;
        },
    });

    models.Order = models.Order.extend({
        get_details_amount: function () {
            var order = this.pos.get_order();
            var detalle = this.pos.get_pos_details_amount(order.number, order.name);
            return detalle;
        },
        get_number_order: function () {
            var doc_number = this.name;
            if (doc_number) {
                doc_number = doc_number.replace('Pedido', '');
            }
            return doc_number;
        },
        get_company_doc_number: function() {
            var doc_number = this.pos.company.vat;
            if ( doc_number ){
                doc_number = doc_number.replace('PER','');
            }else{
                doc_number = '';
            }
            return doc_number;
        }
    });

    screens.PaymentScreenWidget.include({
        /*para eliminar el boton invoice*/
        renderElement: function () {
            var self = this;
            this._super();
            $('.js_invoice').remove();
        },
        order_is_valid: function (force_validation) {
            var res = this._super(force_validation);
            return res;
        },
        validate_journal_invoice: function () {
            var res = this._super()
            var order = this.pos.get_order();
            if (res) {
                return res;
            }
            if (!order.get_sale_journal()) {
                this.gui.show_popup('error', _t('It is required to Select a Journal'));
                res = true;
            }
            return res;
        },
        /*para marcar con invoice*/
        click_sale_journals: function (journal_id) {
            this._super();
            var order = this.pos.get_order();
            if (order.get_sale_journal() != journal_id) {
                order.set_sale_journal(journal_id);
                this.$('.js_sale_journal').removeClass('highlight');
                this.$('div[data-id="' + journal_id + '"]').addClass('highlight');
                order.set_to_invoice(true);
            } else {
                order.set_sale_journal(false);
                this.$('.js_sale_journal').removeClass('highlight');
                order.set_to_invoice(false);
            }
            //console.log("set to is_to_invoice:", order.is_to_invoice )
        },
        partial_payment: function () {
            var self = this;
            var order = this.pos.get_order();
            order.set_to_invoice(true);
            if (order.is_to_invoice()) {
                if (this.validate_journal_invoice()) {
                    return;
                }
                if (order.get_sale_journal() && !order.get_number()) {
                    var numbers = this.pos.get_order_number(order.get_sale_journal());
                    order.set_number(numbers.number);
                    order.set_sequence_number(numbers.sequence_number);
                }
                if (order.get_number() && !order.get_sale_journal()) {
                    order.set_sequence_set(false);
                    order.set_number(false);
                    order.set_sequence_number(0);
                }
                if (order.get_number() && !order.get_sequence_set()) {
                    order.set_sequence_set(true);
                    this.pos.set_sequence(order.get_sale_journal(), order.get_number(), order.get_sequence_number())
                }
                if (!order.get_number() && order.get_sale_journal()) {
                    this.gui.show_popup('error', _t('Could not get the number'));
                    return;
                }

                if (self.order_is_valid(true)) {
                    return;
                }
            }
            this._super();
        },
    });
});
