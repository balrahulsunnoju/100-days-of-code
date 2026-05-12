
with open('testing_copy.py', 'w') as file:
  file.write('def test_func():\n')
  with open('task.py', 'r') as original:
    f2 = original.readlines()[0:100]
    for x in f2:
      file.write("    " + x)


import testing_copy
import unittest
from unittest.mock import patch
from io import StringIO
import os

class MyTest(unittest.TestCase):
  def run_test(self, given_answer, expected_print):
    with patch('builtins.input', side_effect=given_answer), patch('sys.stdout', new=StringIO()) as fake_out: 
      testing_copy.test_func()
      self.assertEqual(expected_print, fake_out.getvalue())

  def test_with_options_S_N_Y(self):
    self.run_test(given_answer=['S', 'N', 'Y'], expected_print='Welcome to Python Pizza Deliveries!\nYour final bill is: $16.\n')

  def test_2(self):
    self.run_test(given_answer=['L', 'N', 'N'], expected_print='Welcome to Python Pizza Deliveries!\nYour final bill is: $25.\n')

  def test_3(self):
    self.run_test(given_answer=['M', 'Y', 'N'], expected_print='Welcome to Python Pizza Deliveries!\nYour final bill is: $23.\n')


print('\n\n\n.\n.\n.')
print('Checking if your print statements match the instructions. \nFor a small pepperoni pizza with extra cheese your program should print this line *exactly*:\n')
print('Your final bill is: $18.\n')
print('\nRunning some tests on your code with different pizza combinations:')
print('.\n.\n.')
unittest.main(verbosity=1, exit=False)

os.remove('testing_copy.py') 