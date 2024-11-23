// eslint-disable-next-line
module.exports = function (context, options) {
    return {
        name: 'niivuePlugin',
        // eslint-disable-next-line
        configureWebpack(config, isServer, utils) {
            return {
                devServer: {
                    client: {
                      overlay: {
                        runtimeErrors: (error) => {
                          if(error?.message === "ResizeObserver loop completed with undelivered notifications.")
                          {
                             console.error(error)
                             return false;
                          }
                          return true;
                        },
                      },
                    },
                  },
                resolve: {
                    // necessary due to the Daikon package ued in NiiVue
                    fallback: {
                        fs: false,
                        path: false
                    }
                },
            };
        },
    };
};