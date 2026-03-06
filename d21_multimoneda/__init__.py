from . import models
import logging
from .config import LANG

_logger = logging.getLogger(__name__)

def post_init_hook(env):
    """ Hook de post-instalación para instalar automáticamente el idioma configurado.
    Por defecto, español. """

    if not LANG:
        return

    _logger.info("Verificando instalación del idioma: %s", LANG)
    
    # Check if language is already installed (use active_test=False to find it even if inactive)
    lang = env['res.lang'].with_context(active_test=False).search([('code', '=', LANG)], limit=1)
    
    if not lang:
        _logger.error("El código de idioma %s no fue encontrado en el sistema.", LANG)
        return

    if not lang.active:
        _logger.info("Instalando/Activando idioma: %s", LANG)
        try:
            # Use the language installation wizard logic for Odoo 18 (lang_ids is a Many2many)
            wizard = env['base.language.install'].create({
                'lang_ids': [(6, 0, lang.ids)], 
                'overwrite': False
            })
            wizard.lang_install()
            _logger.info("Idioma %s instalado exitosamente.", LANG)
        except Exception as e:
            _logger.error("Error instalando el idioma %s: %s", LANG, str(e))
    else:
        _logger.info("El idioma %s ya está activo.", LANG)
