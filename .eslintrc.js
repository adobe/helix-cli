/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

module.exports = {
    // http://eslint.org/docs/rules/

    // this is the root project for all sub modules. stop searching for any
    // eslintrc files in parent directories.
    'root': true,

    'env': {
        'node': true,
        'es6': true
    },

    'plugins': [],

    'rules': {
        // Possible Errors

        'comma-dangle': 2, // disallow trailing commas in object literals
        'no-cond-assign': 2, // disallow assignment in conditional expressions
        'no-console': 0, // disallow use of console
        'no-constant-condition': 2, // disallow use of constant expressions in conditions
        'no-control-regex': 2, // disallow control characters in regular expressions
        'no-debugger': 2, // disallow use of debugger
        'no-dupe-args': 2, // disallow duplicate arguments in functions
        'no-dupe-keys': 2, // disallow duplicate keys when creating object literals
        'no-duplicate-case': 2, // disallow a duplicate case label
        'no-empty-character-class': 2, // disallow the use of empty character classes in regular expressions
        'no-empty': 2, // disallow empty statements
        'no-ex-assign': 2, // disallow assigning to the exception in a catch block
        'no-extra-boolean-cast': 2, // disallow double-negation boolean casts in a boolean context
        'no-extra-parens': 0, // disallow unnecessary parentheses
        'no-extra-semi': 2, // disallow unnecessary semicolons
        'no-func-assign': 2, // disallow overwriting functions written as function declarations
        'no-inner-declarations': 2, // disallow function or variable declarations in nested blocks
        'no-invalid-regexp': 2, // disallow invalid regular expression strings in the RegExp constructor
        'no-irregular-whitespace': 2, // disallow irregular whitespace outside of strings and comments
        'no-negated-in-lhs': 2, // disallow negation of the left operand of an in expression
        'no-obj-calls': 2, // disallow the use of object properties of the global object (Math and JSON) as functions
        'no-regex-spaces': 2, // disallow multiple spaces in a regular expression literal
        'no-reserved-keys': 0, // disallow reserved words being used as object literal keys
        'no-sparse-arrays': 0, // disallow sparse arrays
        'no-unreachable': 2, // disallow unreachable statements after a return, throw, continue, or break statement
        'use-isnan': 2, // disallow comparisons with the value NaN
        'valid-jsdoc': [1, {'requireReturn': false}], // Ensure JSDoc comments are valid
        'valid-typeof': 2, // Ensure that the results of typeof are compared against a valid string
        'no-unexpected-multiline': 2, // Avoid code that looks like two expressions but is actually one

        // Best Practices

        'accessor-pairs': 0, // enforces getter/setter pairs in objects
        'block-scoped-var': 0, // treat var statements as if they were block scoped
        'complexity': 0, // specify the maximum cyclomatic complexity allowed in a program
        'consistent-return': 2, // require return statements to either always or never specify values
        'curly': 2, // specify curly brace conventions for all control statements
        'default-case': 0, // require default case in switch statements
        'dot-notation': 2, // encourages use of dot notation whenever possible
        'dot-location': [2, 'property'], // enforces consistent newlines before or after dots
        'eqeqeq': [2, 'smart'], // require the use of === and !==
        'guard-for-in': 0, // make sure for-in loops have an if statement
        'no-alert': 2, // disallow the use of alert, confirm, and prompt
        'no-caller': 2, // disallow use of arguments.caller or arguments.callee
        'no-div-regex': 2, // disallow division operators explicitly at beginning of regular expression
        'no-else-return': 2, // disallow else after a return in an if
        'no-eq-null': 2, // disallow comparisons to null without a type-checking operator
        'no-eval': 2, // disallow use of eval()
        'no-extend-native': 0, // disallow adding to native types
        'no-extra-bind': 2, // disallow unnecessary function binding
        'no-fallthrough': 2, // disallow fallthrough of case statements
        'no-floating-decimal': 2, // disallow the use of leading or trailing decimal points in numeric literals
        'no-implied-eval': 2, // disallow use of eval()-like methods
        'no-iterator': 2, // disallow usage of __iterator__ property
        'no-labels': 2, // disallow use of labeled statements
        'no-lone-blocks': 2, // disallow unnecessary nested blocks
        'no-loop-func': 0, // disallow creation of functions within loops
        'no-multi-spaces': 2, // disallow use of multiple spaces
        'no-multi-str': 0, // disallow use of multiline strings
        'no-native-reassign': 2, // disallow reassignments of native objects
        'no-new-func': 2, // disallow use of new operator for Function object
        'no-new-wrappers': 2, // disallows creating new instances of String, Number, and Boolean
        'no-new': 2, // disallow use of new operator when not part of the assignment or comparison
        'no-octal-escape': 0,       // disallow use of octal escape sequences in string literals, such as var foo = 'Copyright \251';
        'no-octal': 0, // disallow use of octal literals
        'no-param-reassign': 0, // disallow reassignment of function parameters
        'no-process-env': 2, // disallow use of process.env
        'no-proto': 2, // disallow usage of __proto__ property
        'no-redeclare': 2, // disallow declaring the same variable more then once
        'no-return-assign': 2, // disallow use of assignment in return statement
        'no-script-url': 0, // disallow use of javascript: urls
        'no-self-compare': 2, // disallow comparisons where both sides are exactly the same
        'no-sequences': 2, // disallow use of comma operator
        'no-throw-literal': 2, // restrict what can be thrown as an exception
        'no-unused-expressions': 0, // disallow usage of expressions in statement position
        'no-void': 0, // disallow use of void operator
        'no-warning-comments': 0, // disallow usage of configurable warning terms in comments, e.g. TODO or FIXME
        'no-with': 2, // disallow use of the with statement
        'radix': 2, // require use of the second argument for parseInt()
        'vars-on-top': 0, // requires to declare all vars on top of their containing scope
        'wrap-iife': 2, // require immediate function invocation to be wrapped in parentheses
        'yoda': [2, 'never'], // require or disallow Yoda conditions

        // Variables

        'no-catch-shadow': 2, // disallow the catch clause parameter name being the same as a variable in the outer scope
        'no-delete-var': 2, // disallow deletion of variables
        'no-label-var': 2, // disallow labels that share a name with a variable
        'no-shadow': 2, // disallow declaration of variables already declared in the outer scope
        'no-shadow-restricted-names': 2, // disallow shadowing of names such as arguments
        'no-undef': 2, // disallow use of undeclared variables unless mentioned in a /*global */ block
        'no-undef-init': 2, // disallow use of undefined when initializing variables
        'no-undefined': 2, // disallow use of undefined variable
        'no-unused-vars': [2, {'vars': 'all', 'args': 'none'}], // disallow declaration of variables that are not used in the code
        'no-use-before-define': [2, 'nofunc'], // disallow use of variables before they are defined

        // Stylistic Issues

        'array-bracket-spacing': [2, 'never'], // enforce spacing inside array brackets
        'brace-style': 0, // enforce one true brace style
        'camelcase': 0, // require camel case names
        'comma-spacing': [2, {'before': false, 'after': true}], // enforce spacing before and after comma
        'comma-style': [2, 'last'], // enforce one true comma style
        'computed-property-spacing': [2, 'never'], // require or disallow padding inside computed properties
        'consistent-this': [2, 'self'], // enforces consistent naming when capturing the current execution context
        'eol-last': 2, // enforce newline at the end of file, with no multiple empty lines
        'func-names': 0, // require function expressions to have a name (no anonymous function in the stack trace)
        'func-style': 0, // enforces use of function declarations or expressions
        'indent': 0, // indent spaces
        'key-spacing': [2, {'beforeColon': false, 'afterColon': true}], // enforces spacing between keys and values in objects
        'lines-around-comment': [2, {'beforeBlockComment': true, 'beforeLineComment': false}], // enforces empty lines around comments
        'linebreak-style': [2, 'unix'], // disallow mixed 'LF' and 'CRLF' as linebreaks
        'max-nested-callbacks': [2, 6], // specify the maximum depth callbacks can be nested
        'new-cap': 2, // require a capital letter for constructors
        'new-parens': 2, // disallow the omission of parentheses when invoking a constructor with no arguments
        'newline-after-var': 0, // allow/disallow an empty newline after var statement
        'no-array-constructor': 2, // disallow use of the Array constructor
        'no-continue': 0, // allow use of the continue statement
        'no-inline-comments': 0, // disallow comments inline after code
        'no-lonely-if': 2, // disallow if as the only statement in an else block
        'no-mixed-spaces-and-tabs': 2, // disallow mixed spaces and tabs for indentation
        'no-multiple-empty-lines': 2, // disallow multiple empty lines
        'no-nested-ternary': 2, // disallow nested ternary expressions
        'no-new-object': 2, // disallow use of the Object constructor
        'no-spaced-func': 2, // disallow space between function identifier and application
        'no-ternary': 0, // disallow the use of ternary operators
        'no-trailing-spaces': 2, // disallow trailing whitespace at the end of lines
        'no-underscore-dangle': 0, // disallow dangling underscores in identifiers
        'one-var': 0, // allow just one var statement per function
        'operator-assignment': 0, // require assignment operator shorthand where possible or prohibit it entirely
        'operator-linebreak': 0, // enforce operators to be placed before or after line breaks
        'padded-blocks': 0, // enforce padding within blocks
        'quote-props': [2, 'as-needed', {'keywords': true, 'unnecessary': false, 'numbers': true}], // require quotes around object literal property names
        'quotes': [2, 'single'], // specify whether double or single quotes should be used
        'semi-spacing': [2, {'before': false, 'after': true}], // enforce spacing before and after semicolons
        'semi': [2, 'always'], // require or disallow use of semicolons instead of ASI
        'sort-vars': 0, // sort variables within the same declaration block
        'keyword-spacing': [2, { "after": true }], // require a space after certain keywords
        'space-before-blocks': [2, 'always'], // require or disallow space before blocks
        'space-before-function-paren': [2, 'never'], // require or disallow space before function opening parenthesis
        'space-in-parens': [2, 'never'], // require or disallow spaces inside parentheses
        'space-infix-ops': 2, // require spaces around operators
        'space-unary-ops': [2, {'words': true, 'nonwords': false}], // require or disallow spaces before/after unary operators
        'spaced-comment': [2, 'always'], // require or disallow a space immediately following the // or /* in a comment
        'wrap-regex': 0, // require regex literals to be wrapped in parentheses

        // Legacy

        'max-depth': [2, 8], // specify the maximum depth that blocks can be nested
        'max-len': 0, // specify the maximum length of a line in your program
        'max-params': 0, // limits the number of parameters that can be used in the function declaration.
        'max-statements': 0, // specify the maximum number of statement allowed in a function
        'no-bitwise': 0, // disallow use of bitwise operators
        'no-plusplus': 0 // disallow use of unary operators, ++ and --
    }
};
