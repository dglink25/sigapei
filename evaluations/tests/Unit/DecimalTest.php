<?php

namespace Tests\Unit;

use App\Support\Decimal;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DecimalTest extends TestCase
{
    public function test_conversion_exacte(): void
    {
        $this->assertSame(135000, Decimal::versEchelle('13.5'));
        $this->assertSame(130000, Decimal::versEchelle('13'));
        $this->assertSame(123456, Decimal::versEchelle('12.3456'));
        $this->assertSame(70000, Decimal::versEchelle(7));
        $this->assertSame(-5000, Decimal::versEchelle('-0.5'));
    }

    #[DataProvider('valeursInvalides')]
    public function test_conversion_refuse_les_valeurs_invalides(string $v): void
    {
        $this->expectException(InvalidArgumentException::class);
        Decimal::versEchelle($v);
    }

    public static function valeursInvalides(): array
    {
        return [[''], ['abc'], ['1,5'], ['1.23456'], ['1e3'], ['.5'], ['1.']];
    }

    public function test_arrondi_demi_vers_le_haut(): void
    {
        $this->assertSame('12.35', Decimal::versTexte(Decimal::versEchelle('12.345'), 2));
        $this->assertSame('12.34', Decimal::versTexte(Decimal::versEchelle('12.3449'), 2));
        $this->assertSame('13', Decimal::versTexte(Decimal::versEchelle('12.5'), 0));
        $this->assertSame('12.3', Decimal::versTexte(Decimal::versEchelle('12.25'), 1));
        $this->assertSame('20.00', Decimal::versTexte(Decimal::versEchelle('20'), 2));
        $this->assertSame('0.05', Decimal::versTexte(Decimal::versEchelle('0.05'), 2));
        $this->assertSame('12.346', Decimal::versTexte(Decimal::versEchelle('12.3456'), 3));
    }

    public function test_division_arrondie(): void
    {
        $this->assertSame(3, Decimal::diviserArrondi(10, 4));   // 2,5 -> 3
        $this->assertSame(3, Decimal::diviserArrondi(10, 3));   // 3,33 -> 3
        $this->assertSame(0, Decimal::diviserArrondi(0, 7));
    }

    public function test_division_hors_domaine(): void
    {
        $this->expectException(InvalidArgumentException::class);
        Decimal::diviserArrondi(1, 0);
    }
}
