export interface Tree {
  readonly root: TreeNode
  setRoot(newRoot: TreeNode): void
  mount(parent: Element): void
  unmount(): void
  readonly _el: HTMLDivElement
}
export interface TreeNode {
  content: string
  collapsed: boolean
  readonly children: TreeNode[]
  add(childData: TreeData, index?: number): void
  remove(index: number): void
  getTreeData(): TreeData
  readonly _el: HTMLDivElement
}
export type TreeData = string | [content: string, children: TreeData[]]

export interface TreeParams {
  indent: string
  fontFamily: string
  fontWeight: string
  fontSize: string
  baseFontSize: string
  id: string
  collapsedBullet: string
  expandedBullet: string
}

const defaults: Partial<TreeParams> = {
  indent: "10px",
  fontFamily: "monospace",
  fontWeight: "normal",
  fontSize: "12pt",
  expandedBullet: "- ",
  collapsedBullet: "+ "
}

const compile = (html: string): HTMLElement => {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.children[0] as HTMLElement
}
const treeNode = (params: Partial<TreeParams>) => (el: HTMLDivElement): TreeNode => {
  const childrenElement = el.querySelector(".children") as HTMLDivElement
  const contentEl = el.querySelector(".content") as HTMLSpanElement
  let content = contentEl.innerText
  let children: TreeNode[]
  const setChildren = () => { children = [...childrenElement.children].map(treeNode (params) as any) as TreeNode[] }
  setChildren()
  return {
    get content() { return content },
    set content(c) {
      content = c
      contentEl.innerText = content
    },
    get collapsed() { return childrenElement.classList.contains("collapsed") },
    set collapsed(c) {
      if (c) {
        childrenElement.classList.add("collapsed")
        el.classList.add("collapsed")
      }
      else {
        childrenElement.classList.remove("collapsed")
        el.classList.remove("collapsed")
      }
    },
    get children() { return children },
    add(childData: TreeData, index = -1) {
      const childElement = compile(treeDataToHtml (params) (childData))
      if (index > -1 && index < childrenElement.childElementCount) {
        childrenElement.children[index].before(childElement)
      }
      else {
        childrenElement.append(childElement)
      }
      setChildren()
      addListeners(this)
    },
    remove(index: number) {
      if (index < 0 || index >= childrenElement.childElementCount) return
      else {
        const childElement = childrenElement.children[index]
        childrenElement.removeChild(childElement)
        removeListeners(children[index])
        setChildren()
        addListeners(this)
      }
    },
    getTreeData() { return treeNodeToTreeData(this) },
    _el: el
  }
}
/** If `root` is not a leaf node, add listener callbacks to it and to all its non-leaf descendents. */
const addListeners = (root: TreeNode) => {
  const children = root.children
  const bullets = [...root._el.children].slice(0,2)
  for (const bullet of bullets) {
    if (children.length > 0) {
      (bullet as HTMLSpanElement).onclick = () => { root.collapsed = !root.collapsed }
    }
    else {
      (bullet as HTMLSpanElement).onclick = null
    }
  }
  for (const child of children) addListeners(child)
  return root
}
/** Remove listener callbacks from `root` and all of its descendents. */
const removeListeners = (root: TreeNode) => {
  const children = root.children
  const bullets = [...root._el.children].slice(0,2)
  for (const bullet of bullets) {
    (bullet as HTMLSpanElement).onclick = null
  }
  for (const child of children) removeListeners(child)
  return root
}


const treeNodeToTreeData = (node: TreeNode): TreeData => {
  const { content, children } = node
  if (children.length > 0) return [content, children.map(treeNodeToTreeData)]
  else return content
}
const genTreeNodeHtml = (params: Partial<TreeParams>) => (content: string, ...children: string[]) => {
  const parameters = Object.assign({}, defaults, params)
  return `
    <div class="tree_node">
      <span class="collapsed bullet">${parameters.collapsedBullet}</span>
      <span class="expanded bullet">${parameters.expandedBullet}</span>
      <span class="content">${content}</span>
      <div class="children">
          ${children.join("")}
      </div>
    </div>
  `.replace(/\n\s*/g,"")
}
const treeDataToHtml = (params: Partial<TreeParams>) => (data: TreeData): string => {
  if (typeof data === "string") {
    return genTreeNodeHtml(params)(data)
  }
  else {
    const [content, children] = data
    return genTreeNodeHtml(params)(content, ...children.map(treeDataToHtml(params)))
  }
}
// const genTreeNodeElement = (params: Partial<TreeParams>) => (data: TreeData) => compile(treeDataToHtml (params) (data)) as HTMLDivElement
// const treeNodeToHtml = (params: Partial<TreeParams>) => (node: TreeNode): string => (
//   treeDataToHtml (params) (treeNodeToTreeData (node))
// )
// const treeDataToTreeNode = (params: Partial<TreeParams>) => (data: TreeData) => {
//   return treeNode (params) (genTreeNodeElement (params) (data))
// }
/** Ensure all child html elements have been appended to their parent elements. */
const appendAll = (node: TreeNode) => {
  const { children, _el } = node
  if (children.length === 0) return
  const parent = _el.querySelector(".children") as HTMLDivElement
  if (parent.childElementCount < children.length) {
    for (const childElement of parent.children) {
      childElement.remove()
    }
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      parent.append(child._el)
    }
  }
  for (const child of children) {
    appendAll (child)
  }
}
const tree = (html: string, params: Partial<TreeParams>): Tree => {
  const parameters = Object.assign({}, defaults, params)
  const { indent, id } = parameters
  const style = `
    <style>
      .tree_node {
        margin-left: ${indent};
        padding-right: ${indent};
        padding-top: 0.2em;
        padding-bottom: 0.2em;
        font-family: ${parameters.fontFamily};
        font-size: ${parameters.fontSize};
        font-weight: ${parameters.fontWeight};
      }
      .collapsed.bullet {
        visibility: hidden;
        font-size: 0;
        width: 0;
      }
      .expanded.bullet {
        visibility: visible;
        width: initial;
        font-size: inherit;
      }
      .tree_node.collapsed > .collapsed.bullet {
        visibility: inherit;
        width: initial;
        font-size: inherit;
      }
      .tree_node.collapsed > .expanded.bullet {
        visibility: hidden;
        font-size: 0;
        width: 0;
      }
      .children.collapsed { visibility: hidden; height: 0; }
      .children.collapsed * { visibility: hidden; }
    </style>
  `
  const openingTag = `<div class="tree"${id ? `id="${id}"` : ""}>`
  const outerHtml = (inner: string) => `${openingTag}${style}${inner}</div>`
  const el = compile(outerHtml(html)) as HTMLDivElement
  let root = treeNode (params) (el.querySelector(".tree_node") as HTMLDivElement)

  if (parameters.baseFontSize) root._el.style.fontSize = parameters.baseFontSize

  let mounted = false
  
  return {
    mount(parent: Element) {
      if (!mounted) {
        mounted = true
        parent.append(el)
        addListeners(root)
      }
    },
    unmount() {
      if (mounted) {
        mounted = false
        el.remove()
        removeListeners(root)
      }
    },
    setRoot(newRoot: TreeNode) {
      removeListeners(root)
      root._el.remove()
      root = newRoot
      el.append(newRoot._el)
      appendAll(newRoot)
      addListeners(newRoot)
    },
    get root() { return root },
    _el: el
  }
}

export const createTree = (data: TreeData, params: Partial<TreeParams> = {}): Tree => {
  return tree(treeDataToHtml (params) (data), params)
}
/** Helper function to make writing out `TreeData` a bit easier.  */
export const t = (content: string, ...children: TreeData[]): TreeData => {
  if (children.length === 0) return content
  else return [content, children]
}