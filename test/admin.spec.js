import jwt from 'jsonwebtoken';

const user = { email: 'admin@example.com', password: 'myp@ssw0rd', isAdmin: true };

describe('Admin Page', () => {
    before(() => {
        cy.request('POST', 'http://localhost:3000/test/reset');
        cy.request('POST', 'http://localhost:3000/test/users', { users: [
            user,
            { email: 'user@example.com', password: 'myp@ssw0rd' },
        ] });
        cy.request('POST', 'http://localhost:3000/test/settings', { settings: [
            { name: 'rootDomain', value: 'localhost' },
            { name: 'stripeEnabled', value: 'false' },
            { name: 'stripePublishableKey', value: '' },
            { name: 'stripeSecretKey', value: '' },
            { name: 'templatesUrl', value: '' },
        ] });
        cy.request({
            method: 'POST',
            url: 'http://localhost:3000/graphql',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `mutation {
                login(email: "${user.email}", password: "${user.password}") { token }
            }` }),
        })
            .its('body')
            .then(({ data }) => { user.id = jwt.decode(data.login.token).id; });
    });

    beforeEach(() => {
        cy.setLocalStorage('token', jwt.sign(user, 'mys3cr3t', { expiresIn: '1d' }));
    });

    it('Should display admin page for admin only', () => {
        cy.setLocalStorage('token', jwt.sign({ email: 'user@example.com' }, 'mys3cr3t', { expiresIn: '1d' }));
        cy.visit('/settings');
        cy.get('body').should('not.contain', 'Admin settings');
    });

    it('Should update admin settings', () => {
        cy.visit('/settings');
        cy.get('#root_domain').clear().type('new.ethibox.fr');
        cy.get('main > div:last-child button[type=submit]').click();
        cy.contains('.notification', 'Settings save');
    });

    it('Should enable stripe', () => {
        cy.visit('/settings');
        cy.get('#stripe_enabled').select('true');
        cy.get('#stripe_publishable_key').clear().type(Cypress.env('STRIPE_PUBLISHABLE_KEY'));
        cy.get('#stripe_secret_key').clear().type(Cypress.env('STRIPE_SECRET_KEY'));
        cy.get('main > div:last-child button[type=submit]').click();
        cy.contains('.notification', 'Settings save');
    });

    it('Should not enable stripe if invalid keys', () => {
        cy.visit('/settings');
        cy.get('#stripe_enabled').select('true');
        cy.get('#stripe_publishable_key').clear().type('pk_badkey');
        cy.get('#stripe_secret_key').clear().type('sk_badkey');
        cy.get('main > div:last-child button[type=submit]').click();
        cy.contains('.notification', 'Invalid stripe keys');
    });
});
