odoo.define('flexiretail_com_advance.PaidInputPopup',function(require) {

    var gui = require('point_of_sale.gui');
    var chrome = require('point_of_sale.chrome');
    var PopupWidget = require('point_of_sale.popups');
    var screens = require('point_of_sale.screens');
    var popups = require('point_of_sale.popups');
    var core = require('web.core');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var utils = require('web.utils');
    var QWeb = core.qweb;
    var _t = core._t;


    var PaidInputPopup = PopupWidget.extend({
        template: 'PaidInputPopup',
        init: function(parent, args) {
            this._super(parent, args);
            this.journals = {};
            this.amount_due = 0.0;
            this.order_id = [];
        },
        events: {
            'click .button.cancel':  'click_cancel',
            'click .button.confirm': 'click_confirm',
        },
        show: function(options){
            this._super();
            var self = this;
            this.journals = self.pos.journals;
            this.amount_due = options.amount_due;
            this.order_id = options.order_id;
            this.renderElement();
        },

        click_confirm: function(){
            var self = this;
            //var order = this.pos.get_order();
            var order = self.order_id;
            var pay_amount = $("#pay_amount").val();
            var pos_metodo_pago = $('option:selected', $('[name=select_forma_pago]')).data('id');
            var session_id = self.pos.all_pos_session[0].id;
            rpc.query({
					model: 'pos.order',
					method: 'pay_order',
					args: [order.id,parseFloat(pay_amount),parseInt(session_id), parseInt(pos_metodo_pago)],
					}).then(function(output) {
                        if(output){

                                 var params = {
                                        model: 'pos.order',
                                        method: 'search_read',
                                        domain: [['id', '=', order.id]],
                                    }
                                    rpc.query(params, {async: false}).then(function(orders){
                                        var orden_id = orders[0];
                                        var result;
                                        _.each(self.pos.get('pos_order_list'),function(item) {
                                            if(item.id == orden_id.id){
                                                result = item;
                                            }
                                        });
                                         var selectedOrder = self.pos.get_order();
                                         if (result && result.lines.length > 0) {
                                                 if (result.statement_ids) {
                                                 	var params = {
                                                 		model: 'account.bank.statement.line',
                                                 		method: 'search_read',
                                                 		domain: [['id', 'in', orden_id.statement_ids]],
                                                 	}
                                                 	rpc.query(params, {async: false}).then(function(st){
                                                 		if (st) {
                                                     		_.each(st, function(st_res){
                                                                var newDebtPaymentline = new models.Paymentline(
                                                                    {},
                                                                    {
                                                                        pos: self.pos,
                                                                        order: selectedOrder,
                                                                        cashregister: _.find(self.pos.cashregisters, function (cr) {
                                                                            return cr.journal_id[0] === st_res.journal_id[0];
                                                                        }),
                                                                    }
                                                                );
                                                                newDebtPaymentline.set_amount(st_res.amount);
                                                                selectedOrder.paymentlines.add(newDebtPaymentline);
                                                     		});
                                                         }
                                                 	}).fail(function(){
                                                     	self.pos.db.notification('danger',"Connection lost");
                                                     });
                                                 }
                                                 self.gui.show_screen('receipt');
                                             }

                                    });


                        }
					})

        },
        click_cancel: function(){
            this.gui.close_popup();
        },
    });
    gui.define_popup({name:'paid_popup', widget: PaidInputPopup});


})

