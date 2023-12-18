/**
 * 自定义指令
 * 使用示例：<div v-clickoutside="onClickoutside"></div>
 * 绑定此自定义指令后，如果触发点击的位置不在div内，会触发onClickoutside函数
 */
export default {
  bind (el, binding, vnode) {
    function documentHandler (e) {
      if (el.contains(e.target)) {
        return false
      }
      if (binding.expression) {
        binding.value(e)
      }
    }
    el.__vueClickOutside__ = documentHandler
    document.addEventListener('touchstart', documentHandler)
  },
  unbind (el, binding) {
    document.removeEventListener('touchstart', el.__vueClickOutside__)
    delete el.__vueClickOutside__
  }
}
