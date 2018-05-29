// @flow

import * as React from 'react';

import type {
  FormErrors,
  Options,
  TypedFieldProps,
  TypedFormProp,
} from './types';

type Props<T> = $ReadOnly<{|
  ...Options<T>,
  defaultValues: T,
  children: (TypedFormProp<T>) => React.Node,
|}>;

type State<T> = {|
  values: T,
  invalid: Array<$Keys<T>>,
  lastErrors: FormErrors<T>,
  loading: boolean,
|};

export default class Form<T: {}> extends React.PureComponent<
  Props<T>,
  State<T>
> {
  static defaultProps = {
    defaultValues: {},
  };

  constructor(props: Props<T>) {
    super(props);

    const values: T = props.defaultValues;
    this.state = {
      values,
      invalid: this.determineInvalid(values),
      lastErrors: {},
      loading: false,
    };
  }

  determineInvalid(values: T): Array<$Keys<T>> {
    return this.props.validate && this.props.validateOnChange
      ? Object.keys(this.props.validate(values))
      : [];
  }

  handleValueChange = <FK: string & $Keys<T>, FT: $ElementType<T, FK>>(
    field: FK,
    value: FT
  ): void => {
    // Callback style to avoid race condition
    this.setState(currentState => {
      const values: T = { ...currentState.values, [field]: value };
      return {
        ...currentState,
        values,
        invalid: this.determineInvalid(values),
      };
    });
  };

  getFieldProps = <FK: string & $Keys<T>, FT: $ElementType<T, FK>>(
    field: FK
  ): TypedFieldProps<FT> => {
    const { pristineValues: pristine } = this.props;
    const { values, invalid, lastErrors, loading } = this.state;

    let value = values[field];
    if (value === undefined && pristine && pristine[field] !== undefined) {
      value = pristine[field];
    }

    // Add spaces to the label
    const label = field.replace(/([a-z])([A-Z])/g, '$1 $2');

    return {
      name: field,
      label,
      value,
      handleValueChange: this.handleValueChange.bind(this, field),
      isLoading: loading,
      isValid: this.props.validateOnChange && !invalid.includes(field),
      lastErrors: lastErrors[field],
    };
  };

  prepareFormProp(): TypedFormProp<T> {
    const { loading } = this.state;
    return {
      getFieldProps: this.getFieldProps,
      handleSubmit: this.handleSubmit,
      isLoading: loading,
      setLoading: value => {
        this.setState({ loading: value });
      },
    };
  }

  handleSubmit = (): void => {
    const { values } = this.state;

    if (this.props.validate) {
      const errors = this.props.validate(values);
      this.setState({ lastErrors: errors });
      if (Object.keys(errors).length > 0) return;
    }

    this.props.onSubmit(values, this.prepareFormProp());
  };

  render() {
    const { children } = this.props;

    const form = this.prepareFormProp();
    return children(form);
  }
}
