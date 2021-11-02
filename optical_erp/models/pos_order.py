# -*- coding: utf-8 -*-
from odoo import api, fields, models, _


class PosOrder(models.Model):
	_inherit = 'pos.order'

	optical_reference = fields.Many2one('dr.prescription', string='Optical Reference')

	@api.model
	def _order_fields(self, ui_order):
		res = super(PosOrder, self)._order_fields(ui_order)
		res.update({'optical_reference': ui_order.get('optical_reference')})
		return res
