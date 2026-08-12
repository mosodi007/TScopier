import { Text, TextInput } from 'react-native'
import { instrumentSans } from '@/lib/fonts'

/** Apply Instrument Sans as the default RN text font (no inheritance from parent Views). */
export function applyDefaultAppFont(): void {
  const defaultTextStyle = { fontFamily: instrumentSans.regular }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textProto = Text as any
  textProto.defaultProps = textProto.defaultProps ?? {}
  textProto.defaultProps.style = [defaultTextStyle]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputProto = TextInput as any
  inputProto.defaultProps = inputProto.defaultProps ?? {}
  inputProto.defaultProps.style = [defaultTextStyle]
}
