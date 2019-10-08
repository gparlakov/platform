import { tags } from '@angular-devkit/core';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';
import * as path from 'path';
import { Schema as SelectorOptions } from './schema';
import {
  getTestProjectPath,
  createWorkspace,
} from '../../../schematics-core/testing';

describe('Selector Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@ngrx/schematics',
    path.join(__dirname, '../../collection.json')
  );
  const defaultOptions: SelectorOptions = {
    name: 'foo',
    project: 'bar',
    spec: true,
  };

  const projectPath = getTestProjectPath();

  let appTree: UnitTestTree;

  beforeEach(async () => {
    appTree = await createWorkspace(schematicRunner, appTree);
  });

  it('should create selector files', () => {
    const tree = schematicRunner.runSchematic(
      'selector',
      defaultOptions,
      appTree
    );

    const selectorsContent = tree.readContent(
      `${projectPath}/src/app/foo.selectors.ts`
    );
    const specContent = tree.readContent(
      `${projectPath}/src/app/foo.selectors.spec.ts`
    );

    expect(cleanString(selectorsContent)).toBe(
      cleanString(
        tags.stripIndent`import { createFeatureSelector, createSelector } from '@ngrx/store';`
      )
    );

    expect(cleanString(specContent)).toBe(
      cleanString(tags.stripIndent`
        describe('Foo Selectors', () => {
          it('should select the feature state', () => {
            **
          });
        });`)
    );
  });

  it('should not create a spec file if spec is false', () => {
    const options = {
      ...defaultOptions,
      spec: false,
    };
    const tree = schematicRunner.runSchematic('selector', options, appTree);

    expect(
      tree.files.includes(`${projectPath}/src/app/foo.selectors.spec.ts`)
    ).toBeFalsy();
  });

  it('should group selectors if group is true', () => {
    const options = {
      ...defaultOptions,
      group: true,
    };
    const tree = schematicRunner.runSchematic('selector', options, appTree);

    expect(
      tree.files.includes(`${projectPath}/src/app/selectors/foo.selectors.ts`)
    ).toBeTruthy();
    expect(
      tree.files.includes(
        `${projectPath}/src/app/selectors/foo.selectors.spec.ts`
      )
    ).toBeTruthy();
  });

  it('should not flatten selectors if flat is false', () => {
    const options = {
      ...defaultOptions,
      flat: false,
    };
    const tree = schematicRunner.runSchematic('selector', options, appTree);

    expect(
      tree.files.includes(`${projectPath}/src/app/foo/foo.selectors.ts`)
    ).toBeTruthy();
    expect(
      tree.files.includes(`${projectPath}/src/app/foo/foo.selectors.spec.ts`)
    ).toBeTruthy();
  });

  it('should create a selector for a feature', () => {
    const options = {
      ...defaultOptions,
      feature: true,
    };

    const tree = schematicRunner.runSchematic('selector', options, appTree);
    const selectorsContent = tree.readContent(
      `${projectPath}/src/app/foo.selectors.ts`
    );
    const specContent = tree.readContent(
      `${projectPath}/src/app/foo.selectors.spec.ts`
    );

    expect(cleanString(selectorsContent)).toBe(
      cleanString(tags.stripIndent`
        import { createFeatureSelector, createSelector } from '@ngrx/store';
        import { State, fooFeatureKey } from './foo.reducer';

        export const selectFooState = createFeatureSelector<State>(
          fooFeatureKey
        );
      `)
    );

    expect(cleanString(specContent)).toBe(
      cleanString(tags.stripIndent`
        import { fooFeatureKey } from './foo.reducer';
        import { selectFooState } from './foo.selectors';

        describe('Foo Selectors', () => {
          it('should select the feature state', () => {
            const result = selectFooState({
              [fooFeatureKey]: {}
            });

            expect(result).toEqual({});
          });
        });
      `)
    );
  });

  it('should group and nest the selectors within a feature', () => {
    const options = {
      ...defaultOptions,
      feature: true,
      group: true,
      flat: false,
    };

    const tree = schematicRunner.runSchematic('selector', options, appTree);
    const selectorPath = `${projectPath}/src/app/selectors/foo/foo.selectors.ts`;
    const specPath = `${projectPath}/src/app/selectors/foo/foo.selectors.spec.ts`;

    expect(tree.files.includes(selectorPath)).toBeTruthy();
    expect(tree.files.includes(specPath)).toBeTruthy();

    const selectorContent = tree.readContent(selectorPath);
    expect(selectorContent).toMatch(
      /import\ \{ State, fooFeatureKey \} from\ \'\.\.\/\.\.\/reducers\/foo\/foo\.reducer';/
    );

    const specContent = tree.readContent(specPath);
    expect(specContent).toMatch(
      /import\ \{ fooFeatureKey \} from\ \'\.\.\/\.\.\/reducers\/foo\/foo\.reducer';/
    );
    expect(specContent).toMatch(
      /import\ \{ selectFooState \} from\ \'\.\/foo\.selectors';/
    );
  });

  function cleanString(value: string) {
    // ** to mark an empty line (VSCode removes whitespace lines)
    return value
      .replace(/\r\n/g, '\n')
      .replace(/\*\*/g, '')
      .trim();
  }
});