const addContext = require('../mochawesome/addContext');

Cypress.Commands.add('injectAxe', () => {
  cy.window({ log: false }).then(window => {
    const axe = require('axe-core')
    window.eval(axe.source)
  })
})

Cypress.Commands.add('configureAxe', (configurationOptions = {}) => {
  cy.window({ log: false })
    .then(win => {
      return win.axe.configure(configurationOptions)
    })
})

Cypress.Commands.add('checkA11y', (context, options, violationCallback, skipFailures) => {
  cy.window({ log: false })
    .then(win => {
      if (isEmptyObjectorNull(context)) context = undefined
      if (isEmptyObjectorNull(options)) options = undefined
      if (isEmptyObjectorNull(violationCallback)) violationCallback = undefined
      if (isEmptyObjectorNull(skipFailures)) skipFailures = false
      return win.axe.run(context ? 
            context = context : 
            context = win.document, options)
    })
    .then(({ violations }) => {
      if (violations.length) {
        if (violationCallback) violationCallback(violations)
        cy.wrap(violations, { log: false }).each(v => {
          Cypress.log({
            name: 'a11y error!',
            consoleProps: () => v,
            message: `${v.id} on ${v.nodes.length} Node${
              v.nodes.length === 1 ? '' : 's'
            }`
          })
        })
      }
      return cy.wrap(violations, { log: false })
    })
    .then((violations) => {
      Cypress.on('test:after:run', (test, runnable) => {
          for(let v = 0 ; v < violations.length ; v++) {
              addContext({ test }, {
                  title : '"' + violations[v].impact + '"-"' + violations[v].id + '"-"' + '"-"' + violations[v].help + '"-"' + violations[v].helpUrl,
                  value : violations[v].nodes
              });
          }
      });
      return cy.wrap(violations, { log: false });
    })
    .then(violations => {
      if(!skipFailures)  {
        assert.equal(
          violations.length,
          0,
          `${violations.length} accessibility violation${
            violations.length === 1 ? '' : 's'
          } ${violations.length === 1 ? 'was' : 'were'} detected`
        )
      } else {
        cy.task('log', violations.length === 0 ? "No violations were detected!": `${violations.length} accessibility violation${
          violations.length === 1 ? '' : 's'
        } ${violations.length === 1 ? 'was' : 'were'} detected`);
        for(let v = 0 ; v < violations.length ; v++) {
          let vDetail = "|impact| id| help| helpUrl|\n"
          vDetail = vDetail + `|${violations[v].impact}| ${violations[v].id}| ${violations[v].help}| ${violations[v].helpUrl}|`;
          cy.task('log',  vDetail);
        }
      }
    })
})

function isEmptyObjectorNull(value) {
  if (value == null) return true
  return Object.entries(value).length === 0 && value.constructor === Object
}