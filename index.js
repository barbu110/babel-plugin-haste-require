function mapModule(state, module) {
    const moduleMap = state.opts.map || {};
    if (moduleMap.hasOwnProperty(module)) {
        return moduleMap[module];
    }

    let modulePrefix = state.opts.prefix;
    if (modulePrefix == null) {
        modulePrefix = './';
    }

    return modulePrefix + module;
}

module.exports = function({ types }) {

    /**
     * Will transform `require('moduleName')`.
     */
    function transformRequireCall(path, state) {
        var calleePath = path.get('callee');
        if (
            !types.isIdentifier(calleePath.node, {name: 'require'}) &&
            !(
                types.isMemberExpression(calleePath.node) &&
                types.isIdentifier(calleePath.node.object, {name: 'require'}) &&
                types.isIdentifier(calleePath.node.property, {name: 'requireActual'})
            )
        ) {
            return;
        }

        var args = path.get('arguments');
        if (!args.length) {
            return;
        }

        const moduleArg = args[0];
        if (moduleArg.node.type === 'StringLiteral') {
            const module = mapModule(state, moduleArg.node.value);
            if (module) {
                moduleArg.replaceWith(types.stringLiteral(module));
            }
        }
    }

    /**
     * Will transform `import [kind] [identifier_name] [from] 'moduleName'`.
     */
    function transformImport(path, state) {
        const source = path.get('source');
        if (source.type === 'StringLiteral') {
            const module = mapModule(state, source.node.value);
            if (module) {
                source.replaceWith(types.stringLiteral(module));
            }
        }
    }

    return {
        visitor: {
            CallExpression: {
                exit(path, state) {
                    if (path.node.seen) {
                        return;
                    }

                    transformRequireCall(path, state);
                    path.node.seen = true;
                }
            },
            ImportDeclaration: {
                exit(path, state) {
                    transformImport(path, state);
                }
            }
        }
    };
}
