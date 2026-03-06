# Odoo Proprietary License v1.0
# Copyright (C) 2021 Soluciones DIMAC 21, C.A.
# 
# This software and associated files (the “Software”) may only be used (executed, 
# modified, executed after modifications) if you have purchased a valid license 
# from the authors, typically via Odoo Apps, or if you have received a written 
# agreement from the authors of the Software (see the COPYRIGHT file).
# 
# You may develop Odoo modules that use the Software as a library (typically by 
# depending on it, importing it and using its resources), but without copying any 
# source code or material from the Software. You may distribute those modules 
# under the license of your choice, provided that this license is compatible with 
# the terms of the Odoo Proprietary License (For example: LGPL, MIT, or 
# proprietary licenses similar to this one).
# 
# It is forbidden to publish, distribute, sublicense, or sell copies of the 
# Software or modified copies of the Software.
# 
# The above copyright notice and this permission notice must be included in all 
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
# SOFTWARE.

from lxml import etree
from odoo import models, api
from odoo.addons.d21_multimoneda.config import CURRENCIES, MONETARY_KEYWORDS
import json
import ast
import copy
import logging

logger = logging.getLogger(__name__)

class Base(models.AbstractModel):
    _inherit = 'base'


    @property
    def selected_currencies(self):
        """Returns the list of currency IDs selected by the user in the systray switcher."""
        return self.env.context.get('allowed_currency_ids', [])

    def is_currency_selected(self, code):
        """Returns True if the user has selected the currency with the given code."""
        return self.env.ref(f'base.{code.upper()}').id in self.selected_currencies

    @api.model
    def _get_view_cache_key(self, view_id=None, view_type='form', **options):
        """ Include allowed_currency_ids in the cache key so get_views 
        is re-called when the currency selection changes.
        """
        key = super()._get_view_cache_key(view_id=view_id, view_type=view_type, **options)
        # Append the currency IDs string to the cache key
        currency_ids = self.env.context.get('allowed_currency_ids', [])
        return key + (tuple(currency_ids),)

    @api.model
    def get_native_monetary_fields(self):
        #  Return all fields in the database that are Monetary or that are floats that
        #  match the monetary keywords, excluding d21_ fields.
        Field = self.env['ir.model.fields'].sudo()

        # Search for monetary fields
        monetary_fields_data = Field.search_read(
            domain=[
                ('ttype', '=', 'monetary'),
                ('name', 'not ilike', 'd21_%'),
            ],
            fields=['name']
        )

        # Search for float fields with keywords
        # We need (len(MONETARY_KEYWORDS) - 1) OR operators
        float_domain = [
            ('ttype', '=', 'float'),
            ('name', 'not ilike', 'd21_%'),
        ]
        if MONETARY_KEYWORDS:
            for _ in range(len(MONETARY_KEYWORDS) - 1):
                float_domain.append('|')
            for kw in MONETARY_KEYWORDS:
                float_domain.append(('name', 'ilike', kw))

        float_fields_data = Field.search_read(
            domain=float_domain,
            fields=['name']
        )
        
        # Combine and deduplicate
        all_field_names = {f['name'] for f in monetary_fields_data} | {f['name'] for f in float_fields_data}
        
        logger.info(f"Global monetary fields detected: {len(all_field_names)}")
        return all_field_names

    @api.model
    def _get_view(self, view_id=None, view_type='form', **options):
        arch, view = super()._get_view(view_id, view_type, **options)
        
        if view_type not in ('form', 'list', 'kanban', 'calendar'):
            return arch, view

        allowed_currency_ids = self.env.context.get('allowed_currency_ids', [])
        if not allowed_currency_ids or not CURRENCIES:
            return arch, view

        # Primary currency logic
        primary_currency_code = CURRENCIES[0].lower()

        primary_currency = self.env.ref(f'base.{primary_currency_code.upper()}')
        primary_currency_visible = primary_currency.id in allowed_currency_ids

        native_fields = self.get_native_monetary_fields()

        logger.info(f"View XML: {etree.tostring(arch, pretty_print=True).decode()}")

        # Set para rastrear contenedores ya clonados y evitar duplicados
        cloned_containers = set()

        # Add additional currencies field to the view
        for currency_code in CURRENCIES[1:]:

            currency = self.env.ref(f'base.{currency_code.upper()}')
            if currency.id not in allowed_currency_ids:
                continue

            for field_name in native_fields:
                
                new_field_name = f"d21_{field_name}_{currency_code.lower()}"
                new_currency_field_name = f"d21_moneda_{currency_code.lower()}"

                for node in arch.xpath(f"//field[@name='{field_name}']"):

                    # Tags estructurales de Odoo que no deben clonarse
                    structural_tags = {'group', 'sheet', 'form', 'page', 'header',
                        'notebook', 'tree', 'list', 'kanban', 'main', 'calendar'}

                    # Buscar el contenedor más grande que no sea estructural.
                    # Se sube por el árbol desde el campo hasta encontrar un
                    # padre estructural, y se usa el último no-estructural.
                    container = None
                    current = node.getparent()
                    while current is not None and current.tag not in structural_tags:
                        container = current
                        current = current.getparent()

                    if container is not None:
                        # === CASO A: Campo dentro de un contenedor especial ===
                        # Ej: <div name="list_price_uom"><field name="list_price" .../></div>
                        logger.info(f"Container found: {etree.tostring(container, pretty_print=True).decode()}")

                        # container_id = id(container)
                        # if container_id in cloned_containers:
                        #     continue
                        # cloned_containers.add(container_id)

                        # Clonar el contenedor completo
                        cloned_container = copy.deepcopy(container)

                        # Inyectar campo invisible de moneda dentro del clon
                        curr_node = etree.SubElement(cloned_container, 'field', {
                            'name': new_currency_field_name,
                        })
                        curr_node.set('invisible', '1')
                        curr_node.set('column_invisible', '1')

                        # Actualizar campos monetarios dentro del clon
                        for cloned_field in cloned_container.xpath(".//field"):
                            cloned_field_name = cloned_field.get('name')

                            if cloned_field_name and cloned_field_name in native_fields:

                                cloned_field.set('name', f"d21_{cloned_field_name}_{currency_code.lower()}")
                                cloned_field.set('widget', 'autosave_monetary')

                                # Añadir la clase `o_field_monetary`
                                cloned_field_class = cloned_field.get('class', '')
                                cloned_field.set('class', f"{cloned_field_class} o_field_monetary")
                                
                                if 'string' in cloned_field.attrib:
                                    cloned_field.set('string', f"{cloned_field.get('string')} {currency.symbol}")
                                
                                if 'options' in cloned_field.attrib:
                                    opts = ast.literal_eval(cloned_field.get('options'))
                                    opts['currency_field'] = new_currency_field_name
                                    cloned_field.set('options', str(opts))

                        # Actualizar labels dentro del clon
                        for cloned_label in cloned_container.xpath(".//label"):
                            label_name = cloned_label.get('for')
                            
                            if label_name and label_name in native_fields:
                                cloned_label.set('for', f"d21_{label_name}_{currency_code.lower()}")
                                
                                if 'string' in cloned_label.attrib:
                                    cloned_label.set('string', f"{cloned_label.get('string')} {currency.symbol}")

                        logger.info(f"Cloned container: {etree.tostring(cloned_container, pretty_print=True).decode()}")

                        # Verificar si hay un <label for="..."> como hermano previo
                        # del contenedor. Ej:
                        #   <label for="list_price"/>
                        #   <div name="list_price_uom">
                        #       <field name="list_price" .../>
                        #   </div>
                        prev = container.getprevious()
                        if (prev is not None
                                and prev.tag == 'label'
                                and prev.get('for') in native_fields):
                            # Clonar el label hermano
                            cloned_label = copy.deepcopy(prev)
                            lf = cloned_label.get('for')
                            cloned_label.set('for', f"d21_{lf}_{currency_code.lower()}")
                            if 'string' in cloned_label.attrib:
                                cloned_label.set('string', f"{cloned_label.get('string')} {currency.symbol}")
                            # Insertar: ... container -> cloned_label -> cloned_container ...
                            # addnext inserta inmediatamente después, entonces:
                            container.addnext(cloned_container)
                            container.addnext(cloned_label)
                        else:
                            container.addnext(cloned_container)

                    else:
                        # === CASO B: Campo directo en nodo estructural ===
                        # Ej: <group><field name="categ_id"/></group>

                        # Campo invisible de moneda
                        curr_node = etree.Element('field', {
                            'name': new_currency_field_name,
                        })
                        curr_node.set('invisible', '1')
                        curr_node.set('column_invisible', '1')

                        # Nuevo campo monetario
                        new_node = etree.Element('field', {
                            'name': new_field_name,
                            **{k: v for k, v in node.attrib.items() if k != 'name' and k != 'string'}
                        })
                        new_node.set('widget', 'autosave_monetary')

                        # Añadir la clase `o_field_monetary`
                        new_node_class = new_node.get('class', '')
                        new_node.set('class', f"{new_node_class} o_field_monetary")
                        
                        if 'string' in node.attrib:
                            new_node.set('string', f"{node.attrib['string']} {currency.symbol}")
                        
                        if 'options' in node.attrib:
                            opts = ast.literal_eval(node.attrib['options'])
                            opts['currency_field'] = new_currency_field_name
                            new_node.set('options', str(opts))

                        # Verificar si hay un <label> hermano previo del campo
                        prev = node.getprevious()
                        if (prev is not None
                                and prev.tag == 'label'
                                and prev.get('for') == field_name):
                            # Clonar el label
                            cloned_label = copy.deepcopy(prev)
                            cloned_label.set('for', new_field_name)
                            if 'string' in cloned_label.attrib:
                                cloned_label.set('string', f"{cloned_label.get('string')} {currency.symbol}")
                            # Insertar: ... node -> cloned_label -> new_node -> curr_node ...
                            node.addnext(curr_node)
                            node.addnext(new_node)
                            node.addnext(cloned_label)
                        else:
                            # Sin label, inyectar normalmente
                            node.addnext(curr_node)
                            node.addnext(new_node)


        # Si la moneda principal no está visible, ocultar los campos/contenedores originales
        if not primary_currency_visible:
            hidden_containers = set()

            structural_tags = {'group', 'sheet', 'form', 'page', 'header',
                'notebook', 'tree', 'list', 'kanban', 'main', 'calendar'}

            for field_name in native_fields:
                for node in arch.xpath(f"//field[@name='{field_name}']"):

                    # Buscar el contenedor más grande no-estructural
                    container = None
                    current = node.getparent()
                    while current is not None and current.tag not in structural_tags:
                        container = current
                        current = current.getparent()

                    if container is not None:
                        # container_id = id(container)
                        # if container_id in hidden_containers:
                        #     continue
                        # hidden_containers.add(container_id)

                        # Ocultar el contenedor completo
                        container.set('invisible', '1')
                        container.set('column_invisible', '1')

                        # Ocultar label hermano previo si existe
                        prev = container.getprevious()
                        if (prev is not None
                                and prev.tag == 'label'
                                and prev.get('for') in native_fields):
                            prev.set('invisible', '1')

                        logger.info(f"Hiding container: {etree.tostring(container, encoding='unicode')}")
                    else:
                        # Campo directo: ocultar el nodo y su label hermano
                        node.set('invisible', '1')
                        node.set('column_invisible', '1')

                        prev = node.getprevious()
                        if (prev is not None
                                and prev.tag == 'label'
                                and prev.get('for') == field_name):
                            prev.set('invisible', '1')

                        logger.info(f"Hiding field {etree.tostring(node, encoding='unicode')}")
        
        return arch, view
