# -*- coding: utf-8 -*-

from odoo import models, fields, api, tools, _
import logging

_logger = logging.getLogger(__name__)


class PosOrder(models.Model):
    _inherit = 'pos.order'

    @api.multi
    def pos_get_details_amount(self, number_invoice):
        if self:
            if number_invoice:
                self._cr.execute(
                    " select tx.id, tx.description, ti.company_id, ti.currency_id, tx.pe_tax_code, ai.origin, sum(base) as total " \
                    " from account_invoice_tax ti, account_tax tx, account_invoice ai " \
                    " where ti.tax_id = tx.id " \
                    " and ai.id = ti.invoice_id " \
                    " and ai.number = '%s' " \
                    " and tx.pe_tax_code not in ('7152') " \
                    " group by tx.id, tx.description, ti.company_id, ti.currency_id, tx.pe_tax_code, ai.origin "% (number_invoice)
                )
                data = self._cr.dictfetchall()
                return data
            else:
                return {}
        else:
            return {}

