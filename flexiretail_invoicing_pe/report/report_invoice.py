# -*- coding: utf-8 -*-

from odoo import api, fields, models, _

class PosInvoiceReport(models.AbstractModel):
    _inherit = 'report.point_of_sale.report_invoice'

    @api.model
    def render_html(self, docids, data=None):
        print("render_html docids:", docids)
        print("render_html data:", data)
        res = super(PosInvoiceReport, self).render_html(docids=docids, data=data)
        print("render_html res:", res)
        return res
