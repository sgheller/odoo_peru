# -*- coding: utf-8 -*-

from odoo import api, fields, models,_


class InheritedSaleOrder(models.Model):
    _inherit = 'sale.order'

    prescription_id = fields.Many2one('dr.prescription')
    doctor = fields.Char(related='prescription_id.dr.name')
    prescription_date = fields.Date(related='prescription_id.checkup_date')

    @api.onchange('prescription_id')
    def test(self):
        product = self.env.ref('optical_erp.optical_erp_product')
        self.order_line = None
        if self.prescription_id.eye_examination_chargeable==True:
            self.order_line |= self.order_line.new({
                'name':'',
                'product_id':product.id,
                'product_uom_qty':1,
                'qty_delivered': 1,
                'product_uom':'',
                'price_unit':'',

            })



    # @api.model
    # def create(self,vals):
    #     order_line_product = [(0, 0, {'product_id':30,'partner_invoice_id':12,'partner_id':12})]
    #
    #     vals = {
    #
    #         'order_line': order_line_product,
    #
    #     }
    #     result = super(InheritedSaleOrder,self).create(vals)
    #     return result



    def print_prescription_report(self):
        return {
            'type': 'ir.actions.report',
            'report_name': "optical_erp.sale_prescription_template",
            'report_file': "optical_erp.sale_prescription_template",
            'report_type': 'qweb-pdf'
        }













